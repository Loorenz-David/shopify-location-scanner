# LOGISTIC_MANAGEMENT_PLAN

## Purpose

Executable implementation guide for the post-sale logistics management feature.
Intended for an AI coder (Claude, Copilot, Codex) acting as a senior backend engineer.

**Reference design doc:** `apps/backend/docs/scratch_planing/logistic_managment.md`
**Follow-up plan (do not implement here):** `LOGISTIC_PWA_PUSH_PLAN` — background push notifications via Web Push API. Phase 4 of this plan lays the groundwork for it.

---

## Architecture Alignment Rules

Before writing any code, read and follow these patterns exactly:

| Concern | Pattern |
|---|---|
| Commands | Pure `async function`, named export, file: `{verb}-{noun}.command.ts` |
| Queries | Pure `async function`, named export, file: `{verb}-{noun}.query.ts` |
| Repositories | Exported const object with async methods, `toDomain()` mapper, file: `{noun}.repository.ts` |
| Controllers | Exported const object with async handler methods, file: `{noun}.controller.ts` |
| Routes | Express `Router()`, `asyncHandler` wrapper on every handler, file: `{noun}.routes.ts` |
| Contracts | Zod schemas + exported inferred TypeScript types, file: `{noun}.contract.ts` |
| Domain | Pure TypeScript types only, no Prisma imports, file: `{noun}.domain.ts` |
| Errors | Use classes from `src/shared/errors/http-errors.ts` — `NotFoundError`, `ValidationError`, `ForbiddenError` |
| Logging | `logger.info/warn/error` at start of command, at each significant branch, on errors |
| Auth | `req.authUser.username`, `req.authUser.userId`, `req.authUser.role`, `req.authUser.shopId` — never trust these from request body |
| Multi-table writes | Always in a single `prisma.$transaction(async (tx) => { ... })` |
| WS broadcast | `broadcastToShop(shopId, event)` from `src/modules/ws/ws-broadcaster.ts` |

---

## Phase 1 — Database Schema

**Goal:** Add all new tables, enums, and columns. No application logic changes.

### 1.1 — Modify `apps/backend/prisma/schema.prisma`

#### Update `UserRole` enum
```prisma
enum UserRole {
  admin
  manager
  worker
  seller
}
```

#### Add new enums
```prisma
enum LogisticIntention {
  customer_took_it
  store_pickup
  local_delivery
  international_shipping
}

enum LogisticEventType {
  marked_intention
  placed
  fulfilled
}

enum LogisticZoneType {
  for_delivery
  for_pickup
  for_fixing
}
```

#### Add columns to `ScanHistory` model
Add these fields inside the existing `ScanHistory` model. Add them after the existing `lastSoldChannel` field:
```prisma
orderId              String?
intention            LogisticIntention?
fixItem              Boolean?
scheduledDate        DateTime?
lastLogisticEventType LogisticEventType?
logisticLocationId   String?
logisticsCompletedAt DateTime?

logisticLocation     LogisticLocation?  @relation("ScanHistoryCurrentLocation", fields: [logisticLocationId], references: [id], onDelete: SetNull)
logisticEvents       ScanHistoryLogistic[]
```

Add indexes to `ScanHistory`:
```prisma
@@index([shopId, intention])
@@index([shopId, lastLogisticEventType])
@@index([shopId, logisticsCompletedAt])
@@index([shopId, orderId])
```

#### Add `LogisticLocation` model
```prisma
model LogisticLocation {
  id        String          @id @default(cuid())
  shopId    String
  location  String
  zoneType  LogisticZoneType
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  shop             Shop               @relation(fields: [shopId], references: [id], onDelete: Cascade)
  logisticEvents   ScanHistoryLogistic[]
  currentScanItems ScanHistory[]       @relation("ScanHistoryCurrentLocation")

  @@index([shopId, zoneType])
  @@index([shopId, location])
}
```

Add `logisticLocations LogisticLocation[]` to the `Shop` model relations.

#### Add `ScanHistoryLogistic` model
```prisma
model ScanHistoryLogistic {
  id                 String            @id @default(cuid())
  scanHistoryId      String
  shopId             String
  orderId            String?
  logisticLocationId String?
  username           String
  eventType          LogisticEventType
  happenedAt         DateTime          @default(now())
  createdAt          DateTime          @default(now())

  scanHistory      ScanHistory       @relation(fields: [scanHistoryId], references: [id], onDelete: Cascade)
  shop             Shop              @relation(fields: [shopId], references: [id], onDelete: Cascade)
  logisticLocation LogisticLocation? @relation(fields: [logisticLocationId], references: [id], onDelete: SetNull)

  @@index([scanHistoryId, happenedAt])
  @@index([scanHistoryId, eventType])
  @@index([shopId, eventType, happenedAt])
  @@index([orderId, happenedAt])
}
```

Add `ScanHistoryLogistic[]` to the `Shop` model relations.

### 1.2 — Run migration

```bash
bunx prisma migrate dev --name add_logistic_management
```

Verify the generated migration SQL before applying. Confirm all new tables and columns are present. Confirm `UserRole` enum change did not drop existing `admin` and `worker` values.

---

## Phase 2 — orderId Propagation to ScanHistory

**Goal:** When a `sold_terminal` event is created, `ScanHistory.orderId` is set atomically in the same transaction.

### 2.1 — Modify `apps/backend/src/modules/scanner/repositories/scan-history.repository.ts`

Find the `appendSoldTerminalEventWithFallback` function (or equivalent transaction that writes `sold_terminal` events). Inside the Prisma transaction, when updating `ScanHistory` to mark it sold, also set `orderId`:

```typescript
// Inside the prisma.$transaction block, on the ScanHistory update:
await tx.scanHistory.update({
  where: { id: existing.id },
  data: {
    isSold: true,
    lastSoldChannel: salesChannel ?? null,
    orderId: input.orderId ?? existing.orderId ?? null, // set if provided, never overwrite with null
    lastModifiedAt: happenedAt,
  },
});
```

The `orderId` comes from the existing `input.orderId` field already present on the sold terminal event input. This is a non-breaking addition.

### 2.2 — Update `ScanHistoryRecord` domain type

File: `apps/backend/src/modules/scanner/domain/scan-history.ts`

Add to `ScanHistoryRecord`:
```typescript
orderId: string | null;
```

### 2.3 — Update `toDomain` mapper in the repository

Add `orderId: record.orderId` to the `toDomain` function.

---

## Phase 3 — WS Role-Aware Broadcasting

**Goal:** Allow broadcasts to be filtered by role so logistic events only reach the relevant role's connected clients.

### 3.1 — Modify `apps/backend/src/modules/ws/ws-registry.ts`

Change the registry to store `{ ws, role }` pairs instead of bare `WebSocket` instances:

```typescript
import type WebSocket from "ws";
import type { UserRole } from "@prisma/client";

type WsConnection = {
  ws: WebSocket;
  role: UserRole;
  userId: string;
};

const registry = new Map<string, Set<WsConnection>>();

export const registerConnection = (
  shopId: string,
  ws: WebSocket,
  role: UserRole,
  userId: string,
): void => { ... };

export const removeConnection = (shopId: string, ws: WebSocket): void => {
  // match by ws reference, remove from set
};

export const getConnections = (
  shopId: string,
  roles?: UserRole[],
): WebSocket[] => {
  const all = registry.get(shopId) ?? new Set<WsConnection>();
  return [...all]
    .filter((c) => !roles || roles.includes(c.role))
    .map((c) => c.ws);
};
```

### 3.2 — Modify `apps/backend/src/modules/ws/ws-auth.ts`

Return `role` and `userId` from `waitForAuth`:

```typescript
export type WsAuthResult =
  | { ok: true; shopId: string; userId: string; role: UserRole }
  | { ok: false };

// Inside the resolve: include principal.role
resolve({ ok: true, shopId: principal.shopId, userId: principal.userId, role: principal.role });
```

### 3.3 — Modify `apps/backend/src/modules/ws/ws-server.ts`

Pass `role` and `userId` to `registerConnection`:
```typescript
const { shopId, userId, role } = auth;
registerConnection(shopId, ws, role, userId);
```

Also update the `lastActiveAt` tracking per user in Redis — see Phase 5 for the notification system. For now, just add a placeholder hook call `updateUserActivity(userId)` that is a no-op until Phase 5 implements it.

### 3.4 — Modify `apps/backend/src/modules/ws/ws-broadcaster.ts`

Update `WsOutboundEvent` union and `broadcastToShop` to support role targeting:

```typescript
import type { UserRole } from "@prisma/client";

export type WsOutboundEvent =
  | { type: "authenticated"; shopId: string }
  | { type: "scan_history_updated"; productId: string }
  // Logistic events:
  | { type: "logistic_intention_set"; scanHistoryId: string; orderId: string | null; intention: string }
  | { type: "logistic_item_placed"; scanHistoryId: string; orderId: string | null; logisticLocationId: string }
  | { type: "logistic_item_fulfilled"; scanHistoryId: string; orderId: string | null }
  | { type: "logistic_batch_notification"; count: number; itemIds: string[]; message: string };

export const broadcastToShop = (
  shopId: string,
  event: WsOutboundEvent,
  targetRoles?: UserRole[],
): void => {
  const connections = getConnections(shopId, targetRoles);
  const payload = JSON.stringify(event);

  for (const ws of connections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
};
```

Update `src/shared/queue/ws-bridge.ts` `WsBroadcastMessage` to include optional `targetRoles`:
```typescript
export type WsBroadcastMessage = {
  shopId: string;
  targetRoles?: string[];
  event: { type: string } & Record<string, unknown>;
};
```

---

## Phase 4 — Logistic Module

**Goal:** Create the full `logistic` module with locations CRUD, mark-intention, mark-placement, and the fulfilled service.

### 4.1 — Create module directory structure

```
apps/backend/src/modules/logistic/
  contracts/
    logistic.contract.ts
  domain/
    logistic.domain.ts
  repositories/
    logistic-location.repository.ts
    logistic-event.repository.ts
  services/
    fulfil-logistic-item.service.ts
    logistic-notification.service.ts     ← stub only in this phase, filled in Phase 5
  commands/
    mark-logistic-intention.command.ts
    mark-logistic-placement.command.ts
  queries/
    get-logistic-items.query.ts
  controllers/
    logistic.controller.ts
  routes/
    logistic.routes.ts
```

### 4.2 — `domain/logistic.domain.ts`

Pure TypeScript types. No Prisma imports.

```typescript
export type LogisticIntention =
  | "customer_took_it"
  | "store_pickup"
  | "local_delivery"
  | "international_shipping";

export type LogisticEventType = "marked_intention" | "placed" | "fulfilled";

export type LogisticZoneType = "for_delivery" | "for_pickup" | "for_fixing";

export type LogisticLocation = {
  id: string;
  shopId: string;
  location: string;
  zoneType: LogisticZoneType;
  createdAt: Date;
  updatedAt: Date;
};

export type LogisticEvent = {
  id: string;
  scanHistoryId: string;
  shopId: string;
  orderId: string | null;
  logisticLocationId: string | null;
  username: string;
  eventType: LogisticEventType;
  happenedAt: Date;
  createdAt: Date;
  logisticLocation: LogisticLocation | null;
};

export type LogisticItemSummary = {
  // from ScanHistory
  id: string;
  productId: string;
  itemSku: string | null;
  itemBarcode: string | null;
  itemImageUrl: string | null;
  itemCategory: string | null;
  itemType: string;
  itemTitle: string;
  latestLocation: string | null;
  orderId: string | null;
  intention: LogisticIntention;
  fixItem: boolean | null;
  scheduledDate: Date | null;
  lastLogisticEventType: LogisticEventType | null;
  updatedAt: Date;
  // from latest ScanHistoryLogistic
  logisticEvent: {
    username: string;
    eventType: LogisticEventType;
    location: string | null;
    zoneType: LogisticZoneType | null;
  } | null;
};

export type LogisticItemsPage = {
  orders: Array<{
    orderId: string | null;
    items: LogisticItemSummary[];
  }>;
};
```

### 4.3 — `contracts/logistic.contract.ts`

```typescript
import { z } from "zod";

export const LogisticIntentionSchema = z.enum([
  "customer_took_it",
  "store_pickup",
  "local_delivery",
  "international_shipping",
]);

export const LogisticEventTypeSchema = z.enum([
  "marked_intention",
  "placed",
  "fulfilled",
]);

export const LogisticZoneTypeSchema = z.enum([
  "for_delivery",
  "for_pickup",
  "for_fixing",
]);

export const MarkIntentionInputSchema = z.object({
  scanHistoryId: z.string().min(1),
  intention: LogisticIntentionSchema,
  fixItem: z.boolean(),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be yyyy-mm-dd")
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});

export const MarkPlacementInputSchema = z.object({
  scanHistoryId: z.string().min(1),
  logisticLocationId: z.string().min(1),
});

export const GetLogisticItemsQuerySchema = z.object({
  fixItem: z
    .preprocess(
      (v) => (v === "true" ? true : v === "false" ? false : v),
      z.boolean().optional(),
    ),
  lastLogisticEventType: LogisticEventTypeSchema.optional(),
  zoneType: LogisticZoneTypeSchema.optional(),
  intention: LogisticIntentionSchema.optional(),
  orderId: z.string().optional(),
});

export const CreateLogisticLocationInputSchema = z.object({
  location: z.string().trim().min(1).max(120),
  zoneType: LogisticZoneTypeSchema,
});

export const UpdateLogisticLocationInputSchema = z.object({
  location: z.string().trim().min(1).max(120).optional(),
  zoneType: LogisticZoneTypeSchema.optional(),
});

export type MarkIntentionInput = z.infer<typeof MarkIntentionInputSchema>;
export type MarkPlacementInput = z.infer<typeof MarkPlacementInputSchema>;
export type GetLogisticItemsQuery = z.infer<typeof GetLogisticItemsQuerySchema>;
export type CreateLogisticLocationInput = z.infer<typeof CreateLogisticLocationInputSchema>;
export type UpdateLogisticLocationInput = z.infer<typeof UpdateLogisticLocationInputSchema>;
```

### 4.4 — `repositories/logistic-location.repository.ts`

```typescript
import { prisma } from "../../../shared/database/prisma-client.js";
import type { LogisticLocation } from "../domain/logistic.domain.js";

const toDomain = (record: any): LogisticLocation => ({
  id: record.id,
  shopId: record.shopId,
  location: record.location,
  zoneType: record.zoneType,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

export const logisticLocationRepository = {
  async findById(id: string, shopId: string): Promise<LogisticLocation | null> { ... },
  async findByShop(shopId: string): Promise<LogisticLocation[]> { ... },
  async create(input: { shopId: string; location: string; zoneType: string }): Promise<LogisticLocation> { ... },
  async update(id: string, shopId: string, data: { location?: string; zoneType?: string }): Promise<LogisticLocation> { ... },
  async delete(id: string, shopId: string): Promise<void> { ... },
};
```

### 4.5 — `repositories/logistic-event.repository.ts`

Contains the core atomic write function used by all commands and the fulfilled service.

```typescript
import { prisma } from "../../../shared/database/prisma-client.js";
import type { LogisticEvent } from "../domain/logistic.domain.js";

export const logisticEventRepository = {
  /**
   * Atomically:
   * 1. Creates a ScanHistoryLogistic record
   * 2. Updates ScanHistory denormalised fields (lastLogisticEventType, logisticLocationId)
   * 3. Optionally sets logisticsCompletedAt (for fulfilled events)
   *
   * Always call this inside a transaction or let it manage its own.
   */
  async appendEvent(input: {
    scanHistoryId: string;
    shopId: string;
    orderId: string | null;
    logisticLocationId: string | null;
    username: string;
    eventType: "marked_intention" | "placed" | "fulfilled";
    completedAt?: Date;
  }): Promise<LogisticEvent> {
    return prisma.$transaction(async (tx) => {
      const event = await tx.scanHistoryLogistic.create({
        data: {
          scanHistoryId: input.scanHistoryId,
          shopId: input.shopId,
          orderId: input.orderId,
          logisticLocationId: input.logisticLocationId,
          username: input.username,
          eventType: input.eventType,
        },
        include: { logisticLocation: true },
      });

      await tx.scanHistory.update({
        where: { id: input.scanHistoryId },
        data: {
          lastLogisticEventType: input.eventType,
          logisticLocationId: input.logisticLocationId,
          ...(input.completedAt ? { logisticsCompletedAt: input.completedAt } : {}),
        },
      });

      return toDomain(event);
    });
  },

  async findLatestForScanHistory(scanHistoryId: string): Promise<LogisticEvent | null> { ... },
};
```

### 4.6 — `services/fulfil-logistic-item.service.ts`

Internal service. Called by `mark-logistic-intention.command.ts` for `customer_took_it` and by the external fulfil endpoint for future delivery app integrations.

```typescript
import { prisma } from "../../../shared/database/prisma-client.js";
import { logger } from "../../../shared/logging/logger.js";
import { broadcastToShop } from "../../ws/ws-broadcaster.js";
import { logisticEventRepository } from "../repositories/logistic-event.repository.js";
import { NotFoundError } from "../../../shared/errors/http-errors.js";

export const fulfilLogisticItemService = async (input: {
  scanHistoryId: string;
  shopId: string;
  username: string;
}): Promise<void> => {
  logger.info("Fulfil logistic item started", input);

  const scanHistory = await prisma.scanHistory.findFirst({
    where: { id: input.scanHistoryId, shopId: input.shopId },
    select: { id: true, orderId: true, logisticLocationId: true },
  });

  if (!scanHistory) {
    throw new NotFoundError("ScanHistory record not found");
  }

  await logisticEventRepository.appendEvent({
    scanHistoryId: input.scanHistoryId,
    shopId: input.shopId,
    orderId: scanHistory.orderId ?? null,
    logisticLocationId: scanHistory.logisticLocationId ?? null, // use current placement
    username: input.username,
    eventType: "fulfilled",
    completedAt: new Date(),
  });

  broadcastToShop(
    input.shopId,
    {
      type: "logistic_item_fulfilled",
      scanHistoryId: input.scanHistoryId,
      orderId: scanHistory.orderId ?? null,
    },
    ["seller", "admin"],
  );

  logger.info("Fulfil logistic item completed", input);
};
```

### 4.7 — `services/logistic-notification.service.ts`

**Stub only in this phase.** Exports the functions that Phase 5 will implement. Calling them now is a no-op.

```typescript
// Stub — Phase 5 (LOGISTIC_PWA_PUSH_PLAN preparation) implements these.
// Keeping the interface here ensures Phase 4 code can wire in Phase 5 without refactoring.

export const updateUserActivity = async (_userId: string): Promise<void> => {
  // Phase 5: update Redis key `iss:user:activity:{userId}` with current timestamp
};

export const scheduleRoleNotification = async (
  _shopId: string,
  _role: "worker" | "manager",
): Promise<void> => {
  // Phase 5: enqueue a BullMQ delayed job that checks idle users of this role
  // and sends a logistic_batch_notification WS event if they are still idle
};
```

Call `updateUserActivity(req.authUser.userId)` inside the `authenticateUserMiddleware` or as a lightweight middleware on all logistic routes. Call `scheduleRoleNotification` at the end of `mark-logistic-intention.command.ts` and `mark-logistic-placement.command.ts`.

### 4.8 — `commands/mark-logistic-intention.command.ts`

```typescript
import { NotFoundError, ValidationError } from "../../../shared/errors/http-errors.js";
import { prisma } from "../../../shared/database/prisma-client.js";
import { logger } from "../../../shared/logging/logger.js";
import { broadcastToShop } from "../../ws/ws-broadcaster.js";
import { logisticEventRepository } from "../repositories/logistic-event.repository.js";
import { fulfilLogisticItemService } from "../services/fulfil-logistic-item.service.js";
import { scheduleRoleNotification } from "../services/logistic-notification.service.js";
import type { MarkIntentionInput } from "../contracts/logistic.contract.js";

export const markLogisticIntentionCommand = async (input: {
  shopId: string;
  username: string;
  payload: MarkIntentionInput;
}): Promise<{ scheduledDate: Date | null }> => {
  logger.info("Mark logistic intention started", {
    shopId: input.shopId,
    scanHistoryId: input.payload.scanHistoryId,
    intention: input.payload.intention,
  });

  const scanHistory = await prisma.scanHistory.findFirst({
    where: {
      id: input.payload.scanHistoryId,
      shopId: input.shopId,
      isSold: true,
    },
    select: { id: true, orderId: true, logisticsCompletedAt: true },
  });

  if (!scanHistory) {
    throw new NotFoundError("Sold item not found for this shop");
  }

  if (scanHistory.logisticsCompletedAt) {
    throw new ValidationError("Item logistics are already completed");
  }

  // Update intention fields on ScanHistory
  await prisma.scanHistory.update({
    where: { id: scanHistory.id },
    data: {
      intention: input.payload.intention,
      fixItem: input.payload.fixItem,
      scheduledDate: input.payload.scheduledDate ?? null,
    },
  });

  // Create logistic event — atomic with ScanHistory denormalised field update
  await logisticEventRepository.appendEvent({
    scanHistoryId: scanHistory.id,
    shopId: input.shopId,
    orderId: scanHistory.orderId ?? null,
    logisticLocationId: null,
    username: input.username,
    eventType: "marked_intention",
  });

  // If customer took it — fulfil immediately, no further steps needed
  if (input.payload.intention === "customer_took_it") {
    await fulfilLogisticItemService({
      scanHistoryId: scanHistory.id,
      shopId: input.shopId,
      username: input.username,
    });

    logger.info("Mark logistic intention fulfilled immediately (customer_took_it)", {
      shopId: input.shopId,
      scanHistoryId: scanHistory.id,
    });

    return { scheduledDate: input.payload.scheduledDate ?? null };
  }

  // Notify workers that a new item is ready for placement
  broadcastToShop(
    input.shopId,
    {
      type: "logistic_intention_set",
      scanHistoryId: scanHistory.id,
      orderId: scanHistory.orderId ?? null,
      intention: input.payload.intention,
    },
    ["worker"],
  );

  await scheduleRoleNotification(input.shopId, "worker");

  logger.info("Mark logistic intention completed", {
    shopId: input.shopId,
    scanHistoryId: scanHistory.id,
    intention: input.payload.intention,
  });

  return { scheduledDate: input.payload.scheduledDate ?? null };
};
```

### 4.9 — `commands/mark-logistic-placement.command.ts`

```typescript
// Validates logisticLocationId belongs to shopId
// Calls logisticEventRepository.appendEvent with eventType = "placed"
// Routes WS broadcast by caller role:
//   seller role  → broadcast to ["worker"]
//   worker role  → broadcast to ["manager"] only if fixItem === true, else broadcast to ["seller"]
//   manager role → broadcast to ["seller"]
// Calls scheduleRoleNotification based on target role
// Returns { logisticEvent, scanHistory: { id, lastLogisticEventType, logisticLocationId } }
```

Full implementation follows the pattern of `mark-logistic-intention.command.ts`. Fetch the `ScanHistory.fixItem` from DB to determine broadcast target.

### 4.10 — `queries/get-logistic-items.query.ts`

```typescript
// Queries ScanHistory WHERE:
//   shopId = input.shopId
//   isSold = true
//   intention IS NOT NULL
//   intention != "customer_took_it"
//   logisticsCompletedAt IS NULL
//
// Applies optional filters from query params:
//   fixItem          → ScanHistory.fixItem
//   lastLogisticEventType → ScanHistory.lastLogisticEventType
//   zoneType         → join LogisticLocation via ScanHistory.logisticLocationId, filter by zoneType
//   intention        → ScanHistory.intention
//   orderId          → ScanHistory.orderId
//
// Includes latest ScanHistoryLogistic via:
//   logisticEvents: { orderBy: { happenedAt: "desc" }, take: 1, include: { logisticLocation: true } }
//
// Maps to LogisticItemsPage — groups results by orderId
// Items with orderId=null form a group with orderId: null
// Groups are sorted with non-null orderId groups first
```

### 4.11 — `controllers/logistic.controller.ts`

Follow the exact same pattern as `apps/backend/src/modules/scanner/controllers/scanner.controller.ts`.

```typescript
export const logisticController = {
  // Locations CRUD (admin only)
  listLocations: async (req, res) => { ... },
  createLocation: async (req, res) => { ... },
  updateLocation: async (req, res) => { ... },
  deleteLocation: async (req, res) => { ... },

  // Task management
  getItems: async (req, res) => { ... },
  markIntention: async (req, res) => {
    const payload = MarkIntentionInputSchema.parse(req.body);
    const result = await markLogisticIntentionCommand({
      shopId: req.authUser.shopId as string,
      username: req.authUser.username,
      payload,
    });
    res.status(200).json(result);
  },
  markPlacement: async (req, res) => { ... },
  fulfilItem: async (req, res) => { ... },
};
```

### 4.12 — `routes/logistic.routes.ts`

```typescript
import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { authenticateUserMiddleware } from "../../auth/middleware/authenticate-user.middleware.js";
import { requireShopLinkMiddleware } from "../../auth/middleware/require-shop-link.middleware.js";
import { logisticController } from "../controllers/logistic.controller.js";

export const logisticRouter = Router();

// All logistic routes require authentication and shop link
logisticRouter.use(authenticateUserMiddleware, requireShopLinkMiddleware);

// Logistic locations — admin-managed master data
logisticRouter.get("/locations", asyncHandler(logisticController.listLocations));
logisticRouter.post("/locations", asyncHandler(logisticController.createLocation));
logisticRouter.patch("/locations/:locationId", asyncHandler(logisticController.updateLocation));
logisticRouter.delete("/locations/:locationId", asyncHandler(logisticController.deleteLocation));

// Task list
logisticRouter.get("/items", asyncHandler(logisticController.getItems));

// Actions
logisticRouter.post("/intentions", asyncHandler(logisticController.markIntention));
logisticRouter.post("/placements", asyncHandler(logisticController.markPlacement));
logisticRouter.post("/fulfil", asyncHandler(logisticController.fulfilItem));
```

### 4.13 — Register in `apps/backend/src/server.ts`

Add alongside the existing router registrations:

```typescript
import { logisticRouter } from "./modules/logistic/routes/logistic.routes.js";

// Add after the existing app.use("/zones", zonesRouter) lines:
app.use("/logistic", logisticRouter);
app.use("/api/logistic", logisticRouter);
```

---

## Phase 5 — Deferred Notification System

**Goal:** Implement the stub functions from Phase 4 (`logistic-notification.service.ts`). Lay the Redis/BullMQ foundation that the follow-up PWA push plan (`LOGISTIC_PWA_PUSH_PLAN`) will extend.

**Design constraints for future extensibility:**
- `updateUserActivity` writes to Redis and the notification dispatch reads from it — so Phase 6 (PWA push) only needs to add a push channel to the dispatch, not refactor the activity tracking
- The notification event shape (`logistic_batch_notification`) already matches what a Web Push payload will carry, no changes needed when adding push

### 5.1 — User activity tracking

Key pattern: `iss:user:activity:{userId}` in Redis, value = Unix timestamp ms, TTL = 24 hours.

Update `apps/backend/src/modules/logistic/services/logistic-notification.service.ts`:

```typescript
import { Redis } from "ioredis";
import { env } from "../../../config/env.js";

const USER_ACTIVITY_TTL_SECONDS = 86_400; // 24 hours
const NOTIFICATION_DELAYS_MS = {
  worker: 5 * 60 * 1_000,
  manager: 30 * 60 * 1_000,
} as const;

const activityClient = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });

export const updateUserActivity = async (userId: string): Promise<void> => {
  await activityClient.set(
    `iss:user:activity:${userId}`,
    Date.now().toString(),
    "EX",
    USER_ACTIVITY_TTL_SECONDS,
  );
};

export const isUserIdle = async (
  userId: string,
  thresholdMs: number,
): Promise<boolean> => {
  const raw = await activityClient.get(`iss:user:activity:${userId}`);
  if (!raw) return true;
  return Date.now() - Number(raw) >= thresholdMs;
};
```

### 5.2 — Notification BullMQ queue

Create `apps/backend/src/shared/queue/notification-queue.ts`:

```typescript
import { Queue } from "bullmq";
import { redisConnection } from "./redis-connection.js";

export type NotificationJobPayload = {
  shopId: string;
  role: "worker" | "manager";
};

export const notificationQueue = new Queue<NotificationJobPayload>(
  "logistic-notifications",
  {
    connection: redisConnection,
    prefix: "iss",
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: 50,
      removeOnFail: 100,
    },
  },
);
```

### 5.3 — Notification job worker

Create `apps/backend/src/workers/notification.worker.ts`:

```typescript
// Worker that processes notification jobs:
// 1. Finds all users of the target role for the shop
// 2. Checks isUserIdle() for each
// 3. For idle users: counts pending logistic items for that role
// 4. If count > 0: sends logistic_batch_notification WS event
//
// Message templates:
//   worker:  `${count} item${count > 1 ? "s" : ""} are waiting to be picked up from store`
//   manager: `${count} item${count > 1 ? "s" : ""} have been placed in the fixing area`
```

### 5.4 — `scheduleRoleNotification` implementation

```typescript
export const scheduleRoleNotification = async (
  shopId: string,
  role: "worker" | "manager",
): Promise<void> => {
  const delayMs = NOTIFICATION_DELAYS_MS[role];
  await notificationQueue.add(
    `notify-${role}`,
    { shopId, role },
    {
      delay: delayMs,
      // Use a deduplication jobId so rapid successive placements don't stack up
      jobId: `notify:${shopId}:${role}:${Math.floor(Date.now() / delayMs)}`,
    },
  );
};
```

---

## Phase 6 Reference — PWA Background Push (separate plan)

This phase is documented in `LOGISTIC_PWA_PUSH_PLAN` (to be created).

Phase 5 prepares for it by:
- `iss:user:activity:{userId}` Redis keys are available for push eligibility checks
- `logistic_batch_notification` WS event shape is identical to the intended Web Push payload
- `logistic-notification.service.ts` exports clean functions that can be extended with a push channel
- A new `PushSubscription` DB table will be needed (stores Web Push endpoint + keys per user device)
- VAPID key pair must be generated and stored in env
- Service worker registration is a frontend concern but must be planned alongside

---

## Validation Checklist (per phase)

### Phase 1
- [ ] `bunx prisma migrate dev` runs without errors
- [ ] `bunx prisma studio` shows new tables: `LogisticLocation`, `ScanHistoryLogistic`
- [ ] `ScanHistory` has columns: `orderId`, `intention`, `fixItem`, `scheduledDate`, `lastLogisticEventType`, `logisticLocationId`, `logisticsCompletedAt`
- [ ] `UserRole` enum has: `admin`, `manager`, `worker`, `seller`

### Phase 2
- [ ] Selling an item via `orders/paid` or `orders/create` webhook populates `ScanHistory.orderId`
- [ ] `ScanHistoryRecord` domain type includes `orderId`

### Phase 3
- [ ] `broadcastToShop(shopId, event, ["worker"])` only sends to connected clients with `role = worker`
- [ ] `broadcastToShop(shopId, event)` (no targetRoles) sends to all connected clients as before
- [ ] Existing `scan_history_updated` broadcast is unaffected

### Phase 4
- [ ] `POST /api/logistic/locations` creates a location (admin user)
- [ ] `GET /api/logistic/items` returns grouped results, respects all filter params
- [ ] `POST /api/logistic/intentions` with `intention=customer_took_it` immediately sets `logisticsCompletedAt`
- [ ] `POST /api/logistic/intentions` with any other intention creates `marked_intention` event and broadcasts to workers
- [ ] `POST /api/logistic/placements` creates `placed` event and routes broadcast by caller role
- [ ] `POST /api/logistic/fulfil` sets `logisticsCompletedAt` and broadcasts to seller/admin
- [ ] All multi-table writes verified via DB inspection (no partial writes)
- [ ] `username` in `ScanHistoryLogistic` always matches the authenticated user's username

### Phase 5
- [ ] `updateUserActivity` is called and Redis key is written with correct TTL
- [ ] After `mark-intention`, a delayed notification job is queued in BullMQ
- [ ] Idle worker receives `logistic_batch_notification` WS event with correct count and message
- [ ] Active worker does not receive the notification
- [ ] Rapid successive placements result in one deduped notification job, not multiple
