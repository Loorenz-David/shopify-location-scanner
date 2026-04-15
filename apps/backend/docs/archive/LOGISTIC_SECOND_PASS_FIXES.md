# LOGISTIC_SECOND_PASS_FIXES

## Context

Second-pass review after `LOGISTIC_POST_IMPLEMENTATION_FIXES.md` was applied.
All three previous fixes confirmed in place.

TypeScript still compiles clean (`tsc --noEmit` = 0 errors).
These are runtime behaviour issues: one medium bug, one low-medium consistency bug,
one idle-detection correctness issue, and one minor validation gap.

---

## Issue 1 — Medium Bug: `fulfilLogisticItemService` can be called twice on the same active cycle

### Location

`src/modules/logistic/services/fulfil-logistic-item.service.ts`

### Business rule (clarified)

An item can go through multiple logistics cycles: sold → fulfilled → returned → re-sold →
fulfilled again. This is valid. What must be blocked is calling `fulfil` twice **within the
same active cycle** — i.e., when the item is currently sold (`isSold = true`) and has already
been fulfilled (`logisticsCompletedAt IS NOT NULL`).

When an item is returned its `isSold` flag resets to `false` and a new sale creates a new
cycle. At that point a second `fulfilLogisticItemService` call is legitimate.

### What's wrong

The current query fetches by `id + shopId` with no `isSold` or `logisticsCompletedAt`
constraint. Calling `POST /logistic/fulfil` twice in the same cycle will:
1. Create a second `ScanHistoryLogistic` row with `eventType = "fulfilled"`
2. Overwrite `ScanHistory.logisticsCompletedAt` with a new timestamp
3. Broadcast a second `logistic_item_fulfilled` WS event to seller + admin clients

### Fix

Narrow the query to an **active logistics cycle** (`isSold = true`, `logisticsCompletedAt IS NULL`).
If the item is already completed for the current cycle, `findFirst` returns `null` → `NotFoundError`.
No separate guard block is needed.

```typescript
const scanHistory = await prisma.scanHistory.findFirst({
    where: {
        id: input.scanHistoryId,
        shopId: input.shopId,
        isSold: true,                  // must be in an active sale
        logisticsCompletedAt: null,    // must not already be fulfilled this cycle
    },
    select: { id: true, orderId: true, logisticLocationId: true },
});

if (!scanHistory) {
    // Covers: wrong shop, not sold, already fulfilled this cycle
    throw new NotFoundError("Active logistics item not found");
}
```

> This mirrors the pattern already used in `mark-logistic-placement.command.ts`, which queries
> with `isSold: true` and then checks `logisticsCompletedAt` explicitly. The query-level approach
> used above is slightly cleaner.
>
> The same narrowed query should also be applied to the other commands for consistency
> (they currently check `logisticsCompletedAt` after fetching — both approaches are correct,
> the query-level approach is preferable).

---

## Issue 2 — Low-Medium: `markLogisticIntentionCommand` writes are not atomic

### Location

`src/modules/logistic/commands/mark-logistic-intention.command.ts`

### What's wrong

The command performs two separate database transactions:

```
Transaction A: prisma.scanHistory.update({ intention, fixItem, scheduledDate })
Transaction B: logisticEventRepository.appendEvent(...)
               └─ creates ScanHistoryLogistic
               └─ updates ScanHistory.lastLogisticEventType + logisticLocationId
```

If the server crashes (or SQLite returns SQLITE_BUSY) between A and B:
- `ScanHistory.intention` / `fixItem` / `scheduledDate` are set
- `ScanHistory.lastLogisticEventType` is still null (no event)
- No `ScanHistoryLogistic` row exists

The item enters a half-initialised state: it has an intention but no event trail. The frontend
`GET /logistic/items` query filters on `intention IS NOT NULL`, so the item would appear in the
task list, but `logisticEvent` would be `null` (no event row).

### Fix

Merge both writes into a single `prisma.$transaction`. Replace the two separate calls with:

```typescript
await prisma.$transaction(async (tx) => {
    // Update intention fields
    await tx.scanHistory.update({
        where: { id: scanHistory.id },
        data: {
            intention: input.payload.intention as any,
            fixItem: input.payload.fixItem,
            scheduledDate: input.payload.scheduledDate ?? null,
        },
    });

    // Create logistic event
    await tx.scanHistoryLogistic.create({
        data: {
            scanHistoryId: scanHistory.id,
            shopId: input.shopId,
            orderId: scanHistory.orderId ?? null,
            logisticLocationId: null,
            username: input.username,
            eventType: "marked_intention" as any,
        },
    });

    // Update denormalised fields
    await tx.scanHistory.update({
        where: { id: scanHistory.id },
        data: {
            lastLogisticEventType: "marked_intention" as any,
            logisticLocationId: null,
        },
    });
});
```

> This replaces the existing `await prisma.scanHistory.update(...)` + `await logisticEventRepository.appendEvent(...)` pair.
> `appendEvent` can still be used by `mark-logistic-placement.command.ts` and `fulfil-logistic-item.service.ts`
> where no extra ScanHistory fields need updating in the same transaction.

---

## Issue 3 — Correctness: WS pong does not update user activity

### Location

`src/modules/ws/ws-server.ts` (pong handler, line ~113)

### What's wrong

`updateUserActivity` is now called in `authenticateUserMiddleware` on every HTTP API request.
But a user who has the app open and is watching the logistic items list in real-time (receiving
WS events like `logistic_intention_set`) without clicking any buttons would NOT be making HTTP
API requests. After 5 minutes, `isUserIdle` returns `true` for them.

Result: the notification worker sends them a `logistic_batch_notification` WS event ("N items
waiting") even though they are actively watching the screen. The user sees duplicate information
— they can already see the items in the list.

The ping/pong cycle fires every 30 seconds. Adding `updateUserActivity` on pong is the correct
signal: "browser tab is open, WS connection is alive".

### Fix

In `ws-server.ts`, import `updateUserActivity` and call it on pong:

```typescript
import { updateUserActivity } from "../logistic/services/logistic-notification.service.js";

// Inside the wsServer.on("connection", ...) handler, after auth succeeds:

ws.on("pong", () => {
    isAlive = true;
    void updateUserActivity(userId);   // ← add this line
});
```

> `void` — same pattern as `authenticateUserMiddleware`. Non-blocking, degrades gracefully if
> Redis is unavailable.
>
> The `ws.on("message", ...)` handler does not need the same call — the auth message already
> triggers `authenticateUserMiddleware` → `updateUserActivity` on the corresponding HTTP request.
> Only `pong` is unique to the WS heartbeat path.

---

## Issue 4 — Minor: `scheduledDate` validation accepts logically invalid dates

### Location

`src/modules/logistic/contracts/logistic.contract.ts`, `MarkIntentionInputSchema`

### What's wrong

The current schema validates the format only, not the logical validity:

```typescript
scheduledDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be yyyy-mm-dd")
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
```

`"2026-13-01"` (month 13), `"2026-02-30"` (Feb 30), `"2026-00-01"` (month 0) all pass the
regex. JavaScript's `new Date("2026-13-01")` returns `Invalid Date`.

When Prisma tries to serialise `Invalid Date` into SQLite's DateTime storage, it will throw an
unhandled runtime error, producing a `500` response instead of a proper `400` validation error.

### Fix

Add a `.refine` step after the transform to reject Invalid Date instances:

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

## Implementation Order

1. Issue 1 — `fulfil-logistic-item.service.ts` guard (one-line selector change + guard block)
2. Issue 4 — `logistic.contract.ts` refine (one-line schema addition, no logic change)
3. Issue 3 — `ws-server.ts` pong handler (one import + one `void` call)
4. Issue 2 — `mark-logistic-intention.command.ts` transaction merge (most invasive, do last)

Run `npx tsc --noEmit` after each step.

---

## Validation Checklist

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `POST /logistic/fulfil` called twice on the same item returns `400` on the second call
- [ ] `POST /logistic/intentions` with `scheduledDate: "2026-13-01"` returns `400`, not `500`
- [ ] `POST /logistic/intentions` with `scheduledDate: "2026-02-30"` returns `400`, not `500`
- [ ] After `POST /logistic/intentions` completes, DB shows `ScanHistory.intention`,
  `fixItem`, `scheduledDate`, AND `lastLogisticEventType = "marked_intention"` all set in the
  same write (verify by checking migration to a new DB and running the endpoint while attaching
  a debugger or using Prisma Studio)
- [ ] A user with an open WS connection (app tab open, no button clicks) who receives a pong
  has their Redis key `iss:user:activity:{userId}` refreshed — they are NOT sent a
  `logistic_batch_notification` after the idle threshold elapses
