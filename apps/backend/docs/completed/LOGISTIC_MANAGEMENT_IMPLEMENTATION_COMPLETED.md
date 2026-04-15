# LOGISTIC_MANAGEMENT_IMPLEMENTATION_COMPLETED

**Implementation Date:** April 15, 2026  
**Reference Plan:** `docs/under_development/LOGISTIC_MANAGEMENT_PLAN.md`  
**Status:** All 5 phases complete. TypeScript compiles with zero errors.

---

## Phase 1 — Database Schema ✅

**Migration:** `prisma/migrations/20260415040930_add_logistic_management/`

### Changes Made

**`prisma/schema.prisma`**

- **`UserRole` enum** — extended with `manager` and `seller` (preserved `admin` and `worker`)
- **New enums added:**
  - `LogisticIntention`: `customer_took_it`, `store_pickup`, `local_delivery`, `international_shipping`
  - `LogisticEventType`: `marked_intention`, `placed`, `fulfilled`
  - `LogisticZoneType`: `for_delivery`, `for_pickup`, `for_fixing`
- **`ScanHistory` model** — added columns: `orderId`, `intention`, `fixItem`, `scheduledDate`, `lastLogisticEventType`, `logisticLocationId`, `logisticsCompletedAt`, and relations to `LogisticLocation` and `ScanHistoryLogistic`
- **`ScanHistory` indexes** — added: `shopId+intention`, `shopId+lastLogisticEventType`, `shopId+logisticsCompletedAt`, `shopId+orderId`
- **`Shop` model** — added relations: `logisticLocations`, `scanHistoryLogistics`
- **New model `LogisticLocation`** — `id`, `shopId`, `location`, `zoneType` with indexes on `shopId+zoneType` and `shopId+location`
- **New model `ScanHistoryLogistic`** — `id`, `scanHistoryId`, `shopId`, `orderId`, `logisticLocationId`, `username`, `eventType`, `happenedAt`, `createdAt` with 4 indexes

### Validation

- Migration ran without errors
- `UserRole` enum did not drop existing values
- All new tables created, all new columns present

---

## Phase 2 — orderId Propagation to ScanHistory ✅

### Changes Made

**`src/modules/scanner/domain/scan-history.ts`**

- Added `orderId: string | null` to `ScanHistoryRecord` type (after `lastSoldChannel`)

**`src/modules/scanner/repositories/scan-history.repository.ts`**

- `toDomain()` mapper — added `orderId: record.orderId ?? null`
- `appendSoldTerminalEventWithFallback()` — three write paths updated:
  1. New record `create` path: added `orderId: orderId ?? null`
  2. Existing record update (already-terminal-for-location path): added `orderId: orderId ?? existing.orderId ?? null`
  3. Existing record main update path: added `orderId: orderId ?? existing.orderId ?? null`
- Logic: set orderId if provided; never overwrite with null if existing has one

---

## Phase 3 — WS Role-Aware Broadcasting ✅

### Changes Made

**`src/modules/auth/domain/auth-user.ts`**

- `AuthUser.role` and `AuthPrincipal.role` — extended to `"admin" | "manager" | "worker" | "seller"`

**`src/shared/types/express.d.ts`**

- `Request.authUser.role` — extended to all 4 roles

**`src/modules/auth/contracts/auth.contract.ts`**

- `AuthUserDto.role` — extended to all 4 roles

**`src/modules/auth/repositories/user.repository.ts`**

- `UserRecord.role` — extended to all 4 roles

**`src/modules/ws/ws-registry.ts`**

- Registry now stores `WsConnection = { ws, role, userId }` objects instead of bare `WebSocket`
- `registerConnection(shopId, ws, role, userId)` — new signature
- `removeConnection` — matches by `ws` reference
- `getConnections(shopId, roles?)` — new optional `roles` filter; returns `WebSocket[]`

**`src/modules/ws/ws-auth.ts`**

- `WsAuthResult` — now includes `role: UserRole` when `ok: true`
- `waitForAuth()` — resolves with `principal.role` cast to `UserRole`

**`src/modules/ws/ws-server.ts`**

- Destructures `role` from auth result
- Calls `registerConnection(shopId, ws, role, userId)` with new signature

**`src/modules/ws/ws-broadcaster.ts`**

- `WsOutboundEvent` union — added 4 logistic event types: `logistic_intention_set`, `logistic_item_placed`, `logistic_item_fulfilled`, `logistic_batch_notification`
- `broadcastToShop(shopId, event, targetRoles?)` — new optional `targetRoles` parameter; filters connections by role when provided; broadcasts to all when omitted (backward compatible)

**`src/shared/queue/ws-bridge.ts`**

- `WsBroadcastMessage` — added `targetRoles?: string[]`
- `createWsBroadcastSubscriber` callback — updated to pass `targetRoles` through

**`src/server.ts`**

- `createWsBroadcastSubscriber` callback — passes `targetRoles` to `broadcastToShop`

---

## Phase 4 — Logistic Module ✅

**New directory:** `src/modules/logistic/`

### Files Created

| File                                           | Purpose                                                                                                                                                                                                                                        |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain/logistic.domain.ts`                    | Pure TypeScript types: `LogisticIntention`, `LogisticEventType`, `LogisticZoneType`, `LogisticLocation`, `LogisticEvent`, `LogisticItemSummary`, `LogisticItemsPage`                                                                           |
| `contracts/logistic.contract.ts`               | Zod schemas + inferred types: `MarkIntentionInput`, `MarkPlacementInput`, `FulfilItemInput`, `GetLogisticItemsQuery`, `CreateLogisticLocationInput`, `UpdateLogisticLocationInput`                                                             |
| `repositories/logistic-location.repository.ts` | CRUD for `LogisticLocation`: `findById`, `findByShop`, `create`, `update`, `delete` — throws `NotFoundError` on missing records                                                                                                                |
| `repositories/logistic-event.repository.ts`    | `appendEvent()` — atomic transaction: creates `ScanHistoryLogistic` + updates `ScanHistory` denormalised fields + optionally sets `logisticsCompletedAt`. `findLatestForScanHistory()`                                                         |
| `services/fulfil-logistic-item.service.ts`     | Marks item fulfilled via `appendEvent()` then broadcasts `logistic_item_fulfilled` to `seller` + `admin` roles                                                                                                                                 |
| `services/logistic-notification.service.ts`    | `updateUserActivity`, `isUserIdle`, `scheduleRoleNotification` (Phase 5 implementation)                                                                                                                                                        |
| `commands/mark-logistic-intention.command.ts`  | Sets intention fields on `ScanHistory`, creates `marked_intention` event. For `customer_took_it`: calls `fulfilLogisticItemService` immediately. For others: broadcasts `logistic_intention_set` to `worker` role, schedules role notification |
| `commands/mark-logistic-placement.command.ts`  | Validates location belongs to shop, creates `placed` event, routes broadcast by caller role: seller→worker, worker+fixItem→manager, worker+!fixItem→seller, manager→seller                                                                     |
| `queries/get-logistic-items.query.ts`          | Queries active logistic items (sold, intention set, not completed, not customer_took_it). Applies optional filters. Groups by `orderId` with non-null groups first                                                                             |
| `controllers/logistic.controller.ts`           | Handlers for all 8 endpoints; parses request via Zod schemas; reads auth from `req.authUser`                                                                                                                                                   |
| `routes/logistic.routes.ts`                    | Registers all routes under auth+shop-link middleware                                                                                                                                                                                           |

### Routes Registered in `src/server.ts`

```
GET    /logistic/locations
POST   /logistic/locations
PATCH  /logistic/locations/:locationId
DELETE /logistic/locations/:locationId
GET    /logistic/items
POST   /logistic/intentions
POST   /logistic/placements
POST   /logistic/fulfil
(+ /api/logistic/* mirrors for all above)
```

---

## Phase 5 — Notification System ✅

### Files Created / Modified

**`src/shared/queue/notification-queue.ts`** (new)

- BullMQ queue `logistic-notifications` with prefix `iss`
- Job payload type: `{ shopId: string; role: "worker" | "manager" }`
- Default options: 1 attempt, removeOnComplete: 50, removeOnFail: 100

**`src/modules/logistic/services/logistic-notification.service.ts`** (implemented from stub)

- `updateUserActivity(userId)` — writes `iss:user:activity:{userId}` to Redis with 24h TTL
- `isUserIdle(userId, thresholdMs)` — reads Redis key, returns `true` if missing or stale
- `scheduleRoleNotification(shopId, role)` — enqueues delayed BullMQ job with deduplication jobId: `notify:{shopId}:{role}:{bucketWindow}` preventing stacking
- Delays: worker = 5 min, manager = 30 min
- `NOTIFICATION_DELAYS_MS` exported for worker

**`src/workers/notification-worker.ts`** (new)

- Standalone BullMQ worker process
- Per job: find users of target role for shop → check idle status → count pending items → broadcast `logistic_batch_notification` via Redis pub/sub if idle users + pending items
- Worker pending item filters:
  - `worker`: `lastLogisticEventType = marked_intention` (items ready for placement)
  - `manager`: `fixItem = true AND lastLogisticEventType = placed` (items in fixing area)
- Messages: `"N item(s) are waiting to be picked up from store"` / `"N item(s) have been placed in the fixing area"`
- Broadcasts via `wsBroadcastPublisher` (Redis pub/sub) so API server forwards with role targeting

**`package.json`** — added scripts:

- `dev:notification-worker` — `tsx watch src/workers/notification-worker.ts`
- `start:notification-worker` — `node dist/src/workers/notification-worker.js`

---

## TypeScript Compile Status

```
npx tsc --noEmit → no output (clean)
```

Zero errors across all 5 phases.

---

## Follow-Up: Phase 6 Reference (PWA Push)

Phase 5 lays the groundwork for `LOGISTIC_PWA_PUSH_PLAN`:

- Redis `iss:user:activity:{userId}` keys available for push eligibility
- `logistic_batch_notification` WS event shape identical to intended Web Push payload
- `logistic-notification.service.ts` has clean export interface for push channel extension
- Requires: `PushSubscription` DB table, VAPID key pair in env, service worker on frontend

---

## Second-Pass Bug Fixes

Four runtime correctness issues found during second-pass review after Phases 1–6 were all
complete. Source plan: `docs/under_development/LOGISTIC_SECOND_PASS_FIXES.md`.

---

### Issue 1 — Medium: `fulfilLogisticItemService` could run twice in one cycle

**File:** `src/modules/logistic/services/fulfil-logistic-item.service.ts`

**Root cause:** `findFirst` fetched by `id + shopId` only. Calling `POST /logistic/fulfil`
twice on the same item in one sales cycle would silently create a duplicate
`ScanHistoryLogistic` row, overwrite `logisticsCompletedAt`, and broadcast a second
`logistic_item_fulfilled` WS event.

**Fix:** Narrowed the query to the active cycle only:

```typescript
const scanHistory = await prisma.scanHistory.findFirst({
  where: {
    id: input.scanHistoryId,
    shopId: input.shopId,
    isSold: true,               // must be in an active sale
    logisticsCompletedAt: null, // must not already be fulfilled this cycle
  },
  ...
});

if (!scanHistory) {
  throw new NotFoundError("Active logistics item not found");
}
```

A second call in the same cycle finds no matching row and returns `NotFoundError`. When an
item is returned (`isSold` resets to `false`) and re-sold, a new cycle starts and the call
is legitimate again.

---

### Issue 2 — Low-Medium: `markLogisticIntentionCommand` writes were not atomic

**File:** `src/modules/logistic/commands/mark-logistic-intention.command.ts`

**Root cause:** Two separate database operations:

1. `prisma.scanHistory.update(...)` — writes `intention`, `fixItem`, `scheduledDate`
2. `logisticEventRepository.appendEvent(...)` — creates `ScanHistoryLogistic` row and updates
   `lastLogisticEventType`

A crash between the two left the item with an intention but no event trail and
`lastLogisticEventType = null`. The item would appear in `GET /logistic/items` (filtered by
`intention IS NOT NULL`) but with no matching event row.

**Fix:** Merged all three writes into a single `prisma.$transaction`:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Intention fields
  await tx.scanHistory.update({ where: { id: scanHistory.id }, data: { intention, fixItem, scheduledDate } });
  // 2. Event row
  await tx.scanHistoryLogistic.create({ data: { ..., eventType: "marked_intention" } });
  // 3. Denormalised fields
  await tx.scanHistory.update({ where: { id: scanHistory.id }, data: { lastLogisticEventType: "marked_intention", logisticLocationId: null } });
});
```

`logisticEventRepository` import removed (no longer used in this command).
`logisticEventRepository.appendEvent` is still used by `mark-logistic-placement.command.ts`
and `fulfil-logistic-item.service.ts` where no extra `ScanHistory` fields need updating in
the same transaction.

---

### Issue 3 — Correctness: WS pong did not update user activity

**File:** `src/modules/ws/ws-server.ts`

**Root cause:** `updateUserActivity` was wired into `authenticateUserMiddleware` (HTTP path
only). A user with the app open and watching the logistic list in real-time makes no HTTP
requests — only WS heartbeats. After the idle threshold (5 min for workers, 15 min for
managers) `isUserIdle` returned `true` and they received a `logistic_batch_notification`
even though they were actively watching the screen.

**Fix:** `updateUserActivity` called fire-and-forget on every `pong` event:

```typescript
ws.on("pong", () => {
  isAlive = true;
  void updateUserActivity(userId);
});
```

The ping/pong cycle runs every 30 s, so any open tab refreshes the Redis activity key well
within either idle threshold. Non-blocking — if Redis is unavailable the WS connection
continues normally and idle detection degrades gracefully.

---

### Issue 4 — Minor: `scheduledDate` accepted logically invalid dates

**File:** `src/modules/logistic/contracts/logistic.contract.ts`

**Root cause:** The regex `/^\d{4}-\d{2}-\d{2}$/` validated format only. Values like
`"2026-13-01"` (month 13) and `"2026-02-30"` (Feb 30) passed validation. `new Date()`
returned `Invalid Date`, which Prisma cannot serialise — producing an unhandled `500` instead
of a proper `400`.

**Fix:** `.refine()` added after `.transform()` to reject `Invalid Date` instances:

```typescript
scheduledDate: z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be yyyy-mm-dd")
  .optional()
  .transform((v) => (v ? new Date(v) : undefined))
  .refine(
    (v) => v === undefined || !isNaN(v.getTime()),
    "scheduledDate is not a valid calendar date",
  ),
```

---

### Compile Status After Second-Pass Fixes

`npx tsc --noEmit` — **0 errors**

---

## Logistic Items Filter Additions

Source plan: `docs/under_development/LOGISTIC_API_FILTER_ADDITIONS.md`.
Additive only — no existing behaviour changed.

### Change 1 — `ids` filter (targeted refetch by scanHistoryId)

**Purpose:** When the frontend receives a WS event (`logistic_intention_set`,
`logistic_item_placed`, `logistic_item_fulfilled`) it refetches only the affected
items by their `scanHistoryId` instead of re-fetching the full list.

**`src/modules/logistic/contracts/logistic.contract.ts`**

```typescript
ids: z.string().optional(), // comma-separated scanHistory IDs
```

**`src/modules/logistic/queries/get-logistic-items.query.ts`**

```typescript
if (filters.ids) {
  const idList = filters.ids
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (idList.length > 0) {
    where.id = { in: idList };
  }
}
```

Usage: `GET /api/logistic/items?ids=abc123,def456`

---

### Change 2 — `noIntention` filter (seller task view)

**Purpose:** The seller task page shows sold items that have not yet had an
intention set (`intention IS NULL`). The base query normally requires
`intention IS NOT NULL` — `noIntention=true` inverts this guard.

**`src/modules/logistic/contracts/logistic.contract.ts`**

```typescript
noIntention: z.preprocess((v) => v === "true" || v === true, z.boolean()).optional(),
```

**`src/modules/logistic/queries/get-logistic-items.query.ts`**

```typescript
intention: filters.noIntention
  ? null                              // IS NULL — items needing intention set
  : { not: null, notIn: ["customer_took_it"] },
```

Usage: `GET /api/logistic/items?noIntention=true`

**`src/modules/logistic/controllers/logistic.controller.ts`**

Both `ids` and `noIntention` forwarded from `req.query` through the schema parse.

---

### Compile Status After Filter Additions

`npx tsc --noEmit` — **0 errors**
