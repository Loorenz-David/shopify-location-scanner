# Logistics Management — Backend Design Plan

## Objective

Extend the item tracking system to cover the post-sale logistics flow.
The system currently tracks item movements inside the store before sale.
This plan adds a separate, structured pipeline for what happens after an item is sold.

---

## Two-Phase Tracking Model

| Phase | Scope | Terminal state |
|---|---|---|
| Pre-sale (existing) | Item movements inside the store | `sold_terminal` event on `ScanHistoryEvent` |
| Post-sale (new) | Logistics handling after sale | `fulfilled` event on `ScanHistoryLogistic` |

These two phases are fully separated. The logistics pipeline begins when a `sold_terminal` event is recorded and an intention is assigned.

---

## Roles

Add two new roles to the existing `admin | worker` enum:

```
admin, manager, worker, seller
```

Roles are embedded in the JWT token identity. The backend uses them for WebSocket room targeting and push event routing. The backend does **not** enforce role-based access at the endpoint level — that is a frontend UI concern.

---

## Logistics Workflow

```
Item sold (sold_terminal)
  → Seller assigns intention
      → ScanHistoryLogistic: eventType = "marked_intention"
  → Item appears in worker task list
      → Worker places item in zone, scans confirmation
          → ScanHistoryLogistic: eventType = "placed"
              → If fixItem = true → item appears in manager task list
                  → Manager resolves and confirms final placement
                      → ScanHistoryLogistic: eventType = "placed" (by manager)
  → Item is fulfilled (customer took it / external delivery confirmation)
      → ScanHistoryLogistic: eventType = "fulfilled"  ← terminal state
```

Items are removed from task lists by frontend live filters based on `lastLogisticEventType` and `logisticsCompletedAt`. The backend exposes the data; the frontend decides what each role sees.

---

## Schema

### Existing `UserRole` enum — updated

```prisma
enum UserRole {
  admin
  manager
  worker
  seller
}
```

### New `LogisticIntention` enum

```prisma
enum LogisticIntention {
  customer_took_it
  store_pickup
  local_delivery
  international_shipping
}
```

### New `LogisticEventType` enum

```prisma
enum LogisticEventType {
  marked_intention
  placed
  fulfilled           // terminal state — no further events after this
}
```

### New `LogisticZoneType` enum

```prisma
enum LogisticZoneType {
  for_delivery
  for_pickup
  for_fixing
}
```

### New `LogisticLocation` table

Locations used during logistics moves. Shop-scoped, managed independently from Shopify metafield locations.

```prisma
model LogisticLocation {
  id           String          @id @default(cuid())
  shopId       String
  location     String
  zoneType     LogisticZoneType
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  shop                  Shop                   @relation(...)
  scanHistoryLogistics  ScanHistoryLogistic[]
  scanHistories         ScanHistory[]          // via logisticLocationId

  @@index([shopId, zoneType])
}
```

### New `ScanHistoryLogistic` table

Event log of all post-sale logistic actions. Children of `ScanHistory`.

```prisma
model ScanHistoryLogistic {
  id                 String           @id @default(cuid())
  scanHistoryId      String
  shopId             String
  orderId            String?          // Shopify order ID — enables order-level grouping
  logisticLocationId String?          // null for "marked_intention" events
  username           String           // sourced from JWT, never from client payload
  eventType          LogisticEventType
  happenedAt         DateTime         @default(now())
  createdAt          DateTime         @default(now())

  scanHistory      ScanHistory      @relation(...)
  shop             Shop             @relation(...)
  logisticLocation LogisticLocation? @relation(...)

  @@index([scanHistoryId, happenedAt])
  @@index([scanHistoryId, eventType])
  @@index([shopId, eventType, happenedAt])
  @@index([orderId, happenedAt])
}
```

### `ScanHistory` — new columns

```prisma
// Additions to existing ScanHistory model
orderId                String?               // Shopify order ID — set when sold_terminal event is written
intention              LogisticIntention?    // set by seller
fixItem                Boolean?              // null = not evaluated, true = needs fixing
scheduledDate          DateTime?             // for delivery/pickup scheduling
lastLogisticEventType  LogisticEventType?    // denormalised cache — always updated atomically
logisticLocationId     String?               // FK to LogisticLocation (current placement)
logisticsCompletedAt   DateTime?             // null = active, set = fulfilled/done
```

**`orderId` population:** When `appendSoldTerminalEventWithFallback` writes a `sold_terminal` event to `ScanHistoryEvent`, it must also set `ScanHistory.orderId` from the event's `orderId` in the same transaction. This is the single point where the order context enters the logistics chain. `ScanHistoryLogistic` records then inherit it from `ScanHistory` at write time — no lookup needed.

**Important:** `lastLogisticEventType` and `logisticLocationId` on `ScanHistory` are denormalised fields. They **must always** be updated in the same Prisma transaction as the `ScanHistoryLogistic.create()` that changes them. They are never updated independently.

---

## Fulfilled Service

`fulfilled` is a terminal state. It is implemented as an internal service function that can be called by:

- Internal logic (e.g. "customer took it" intention automatically triggers it on mark-intention)
- Future external API integrations (e.g. delivery logistics app webhook)

```typescript
// Internal service — not tied to a specific endpoint
fulfillLogisticItem(input: {
  scanHistoryId: string;
  shopId: string;
  username: string;      // from JWT or external system identifier
  orderId?: string;
}): Promise<void>
```

This service:
1. Resolves the current `ScanHistory.logisticLocationId` to use as the final location
2. Creates a `ScanHistoryLogistic` with `eventType = "fulfilled"` and that location
3. Updates `ScanHistory.lastLogisticEventType = "fulfilled"` and `ScanHistory.logisticsCompletedAt = now()`
4. Pushes a `logistic_item_fulfilled` WS event
5. All writes are atomic (single Prisma transaction)

When the intention is `customer_took_it`, the `mark-intention` endpoint calls this service immediately after creating the `marked_intention` event — no separate placement step is needed.

---

## Endpoints

### `POST /logistic/intentions`

Assigns a logistic intention to a sold item. Triggers the `fulfilled` service immediately if intention is `customer_took_it`.

**Payload:**
```typescript
{
  scanHistoryId: string;
  intention: LogisticIntention;
  fixItem: boolean;
  scheduledDate?: string; // yyyy-mm-dd, validated and stored as DateTime
}
```
`username` is sourced from `req.authUser.username` — never from the payload.

**Behaviour:**
1. Validates `scanHistoryId` belongs to the authenticated shop
2. Creates `ScanHistoryLogistic` with `eventType = "marked_intention"`, `logisticLocationId = null`, `orderId` from `ScanHistory.orderId` if available
3. Updates `ScanHistory.intention`, `ScanHistory.fixItem`, `ScanHistory.scheduledDate`, `ScanHistory.lastLogisticEventType = "marked_intention"` — in a single transaction
4. If `intention = "customer_took_it"` → calls `fulfillLogisticItem` service immediately
5. Pushes `logistic_intention_set` WS event to worker rooms
6. Responds with `{ scheduledDate }` (supports future delivery API integrations)

---

### `GET /logistic/items`

Returns items that are in the active logistics pipeline (have an intention, not yet fulfilled), with their latest logistic event and location.

**Query params (all optional):**

| Param | Type | Notes |
|---|---|---|
| `fixItem` | boolean | Filter by fixItem value |
| `lastLogisticEventType` | enum | Filter by last event type on ScanHistory |
| `zoneType` | enum | Filter by LogisticLocation.zoneType of the current placement |
| `intention` | enum | Filter by ScanHistory.intention |
| `orderId` | string | Filter to a specific Shopify order |

**Filter implementation notes:**
- All filters apply to `ScanHistory` columns directly (no subquery) except `zoneType`, which requires a join to `LogisticLocation` via `ScanHistory.logisticLocationId`.
- `lastLogisticEventType` uses the denormalised column on `ScanHistory` — avoids a subquery across `ScanHistoryLogistic`.
- Base filter always excludes `logisticsCompletedAt IS NOT NULL` and `intention IS NULL` and `intention = "customer_took_it"`.

**Default params by role (frontend responsibility, documented here for clarity):**

| Role | Default params |
|---|---|
| Worker | `lastLogisticEventType=marked_intention` |
| Manager | `lastLogisticEventType=placed&zoneType=for_fixing` |
| Seller | no defaults (sees all active items) |

**Response shape:**
```typescript
{
  // grouped by orderId — items with no orderId go in a null group
  orders: Array<{
    orderId: string | null;
    items: Array<{
      // ScanHistory fields
      id: string;
      productId: string;
      itemSku: string | null;
      itemBarcode: string | null;
      itemImageUrl: string | null;
      itemCategory: string | null;
      itemType: string;
      itemTitle: string;
      latestLocation: string | null;
      intention: LogisticIntention;
      fixItem: boolean | null;
      scheduledDate: string | null;
      lastLogisticEventType: LogisticEventType | null;
      updatedAt: string;
      // Latest ScanHistoryLogistic fields (null if no logistic event yet)
      logisticEvent: {
        username: string;
        eventType: LogisticEventType;
        location: string | null;       // LogisticLocation.location, falls back to latestLocation
        zoneType: LogisticZoneType | null;
      } | null;
    }>;
  }>;
}
```

---

### `POST /logistic/placements`

Records that a worker or manager has physically placed an item in a logistic location.

**Payload:**
```typescript
{
  scanHistoryId: string;
  logisticLocationId: string;   // validated — must exist and belong to same shop
}
```
`username` is sourced from `req.authUser.username`.

**Behaviour:**
1. Validates `logisticLocationId` exists and belongs to the shop
2. Creates `ScanHistoryLogistic` with `eventType = "placed"`, `orderId` from parent `ScanHistory`
3. Updates `ScanHistory.logisticLocationId` and `ScanHistory.lastLogisticEventType = "placed"` — in a single transaction
4. WS push routing:
   - If caller role is `seller` → push to worker rooms
   - If caller role is `worker` → push to manager rooms (if `fixItem = true`), else no push needed
   - If caller role is `manager` → push to seller rooms
5. Responds with `{ logisticEvent: ScanHistoryLogistic, scanHistory: updated ScanHistory fields }`

---

### `POST /logistic/fulfil` *(thin wrapper for external callers)*

Thin HTTP wrapper around the `fulfillLogisticItem` internal service. Used by future external integrations (delivery apps, etc.).

**Payload:**
```typescript
{
  scanHistoryId: string;
  externalReference?: string;  // e.g. delivery tracking number
}
```

---

## WebSocket Event System

### Existing infrastructure

The current WS bridge broadcasts on Redis channel `iss:ws:broadcast`, scoped by `shopId`. Each connected client filters by `shopId`. This foundation is reused.

### Role-based routing

Add a `role` field to the broadcast message. Each connected client also knows its own role (from the JWT) and filters events accordingly. No separate room infrastructure needed — role is just another filter on the same channel.

```typescript
type WsBroadcastMessage = {
  shopId: string;
  targetRoles?: UserRole[];   // if absent, all roles receive
  event: { type: string } & Record<string, unknown>;
};
```

### Logistic WS events

| Event type | Target roles | Payload |
|---|---|---|
| `logistic_intention_set` | worker | `{ scanHistoryId, orderId, intention }` |
| `logistic_item_placed` | manager (if fixItem), seller | `{ scanHistoryId, orderId, logisticLocationId }` |
| `logistic_item_fulfilled` | seller, admin | `{ scanHistoryId, orderId }` |

The frontend receives the event and decides whether to refresh the item list or update in place. Events carry IDs, not full objects — the frontend fetches if needed.

### Deferred batch notifications

**Phase 1 scope (this plan): WebSocket only — app must be open.**

Notification logic:
- Track `lastActiveAt` per user in Redis (updated on WS heartbeat or any API call)
- A BullMQ delayed job checks idle users per role and sends a count-based WS event after the configured delay
- If the user becomes active before the delay fires, the job is cancelled or its result is ignored
- Delays are named constants, not hardcoded

```typescript
const NOTIFICATION_DELAYS = {
  worker: 5 * 60 * 1000,    // 5 minutes idle → notify of pending items
  manager: 30 * 60 * 1000,  // 30 minutes idle → notify of items in fixing zone
};
```

WS notification event shape:
```typescript
{
  type: "logistic_batch_notification";
  count: number;
  itemIds: string[];   // IDs of pending items for that role
  message: string;     // e.g. "3 items are waiting to be picked up from store"
}
```

**Phase 2 (separate plan — `LOGISTIC_PWA_PUSH_PLAN`):**

Phase 1 prepares for background push by:
- Storing the `lastActiveAt` per user in Redis (reused by the push service)
- Designing the notification event shape to match the Web Push payload format (so the WS event and the push notification carry the same data)
- Keeping the notification dispatch logic in a standalone `notificationService` that Phase 2 can extend with a push channel without touching the Phase 1 code

Phase 2 will cover: VAPID key generation, Web Push subscription storage (new DB table `PushSubscription`), service worker registration on the frontend, and background delivery when the app is closed.

---

## Implementation Notes

- All multi-table writes use Prisma transactions — no partial state possible
- `username` is always sourced from the JWT (`req.authUser.username`) — never trusted from request body
- `scheduledDate` is stored as `DateTime` in the DB and returned as ISO string in responses
- Wrong placement validation (item placed in a zone that doesn't match its intention) is a frontend UI concern — the backend accepts any valid `logisticLocationId` and the frontend warns the user with an override option
- `fixItem` is a record field set by the seller at intention time — it is not computed by the backend
- `orderId` is propagated from `ScanHistory` into each `ScanHistoryLogistic` record at write time, enabling order-level grouping without a join
