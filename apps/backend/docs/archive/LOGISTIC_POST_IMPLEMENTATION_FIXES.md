# LOGISTIC_POST_IMPLEMENTATION_FIXES

## Purpose

Three bugs found during post-implementation review of the logistic management system
(Phases 1–6 / `LOGISTIC_MANAGEMENT_PLAN`, `LOGISTIC_LOCATION_CRUD_PLAN`, `LOGISTIC_PWA_PUSH_PLAN`).
TypeScript compiles clean (`tsc --noEmit` = 0 errors), but these are runtime behaviour bugs.

---

## Bug 1 — CRITICAL: Role-targeted WS notifications from worker go to all users

### Root cause

`createWsBroadcastPublisher().publish()` in `src/shared/queue/ws-bridge.ts` only accepts
`(shopId, event)`. It never includes `targetRoles` in the published Redis message.

The notification worker works around this with:
```typescript
await wsBroadcastPublisher.publish(shopId, {
    ...payload,
    targetRoles: [role],   // ← stuffed into the event body, not the message
} as any);
```

When the subscriber on the API server receives the message it reads:
```typescript
onMessage(parsed.shopId, parsed.event, parsed.targetRoles);
//                                      ^^^^^^^^^^^^^^^^^^ always undefined
```

`parsed.targetRoles` is always `undefined` because `targetRoles` was written into
`parsed.event`, not the top-level `WsBroadcastMessage`. As a result `broadcastToShop` sends
`logistic_batch_notification` to **all** connected users for the shop, regardless of role.

### Fix

**File: `src/shared/queue/ws-bridge.ts`**

Add `targetRoles` as a third optional parameter to `publish` and include it in the message:

```typescript
// Before (line ~25):
const publish = async (
    shopId: string,
    event: WsBroadcastMessage["event"],
): Promise<void> => {
    const message: WsBroadcastMessage = { shopId, event };
    await client.publish(WS_BROADCAST_CHANNEL, JSON.stringify(message));
};

// After:
const publish = async (
    shopId: string,
    event: WsBroadcastMessage["event"],
    targetRoles?: string[],
): Promise<void> => {
    const message: WsBroadcastMessage = { shopId, event, ...(targetRoles ? { targetRoles } : {}) };
    await client.publish(WS_BROADCAST_CHANNEL, JSON.stringify(message));
};
```

**File: `src/workers/notification-worker.ts`**

Remove the `as any` workaround and pass `targetRoles` as the third argument:

```typescript
// Before (lines ~124–127):
await wsBroadcastPublisher.publish(shopId, {
    ...payload,
    targetRoles: [role],
} as any);

// After:
await wsBroadcastPublisher.publish(shopId, payload, [role]);
```

> `webhook-worker.ts` calls `publish(shopId, event)` with only 2 args — the optional third
> parameter is backwards-compatible and requires no change there.

---

## Bug 2 — Floating promise: stale WS connection cleanup

### Root cause

`broadcastToShop` in `src/modules/ws/ws-broadcaster.ts` is synchronous. When it encounters
a non-OPEN connection it calls:

```typescript
removeConnection(shopId, ws);
```

`removeConnection` is now `async` (it does Redis `SREM`). Calling it without `await` or `void`
creates an unhandled promise. This can suppress errors and may leave stale entries in the Redis
presence set if the cleanup silently fails.

### Fix

**File: `src/modules/ws/ws-broadcaster.ts`**

Prefix with `void` to make the fire-and-forget intent explicit:

```typescript
// Before:
removeConnection(shopId, ws);
logger.info("WS: removed stale connection", { shopId });

// After:
void removeConnection(shopId, ws);
logger.info("WS: removed stale connection", { shopId });
```

> `broadcastToShop` is synchronous by design (called from commands at the end of request handlers).
> Making it async would require changes across all call sites. Fire-and-forget is correct here —
> stale connection cleanup is best-effort.

---

## Bug 3 — `updateUserActivity` is never called: idle detection always returns true

### Root cause

`updateUserActivity` was implemented in Phase 5 (`logistic-notification.service.ts`) but
was never wired up anywhere. `iss:user:activity:{userId}` Redis keys are never written, so
`isUserIdle` always returns `true` (key missing → treat as idle).

Effect: every BullMQ notification job sends notifications to ALL users of the target role,
regardless of whether they are actively using the app. The "skip if active" logic is completely
bypassed.

### Fix

**File: `src/modules/auth/middleware/authenticate-user.middleware.ts`**

Add a fire-and-forget `updateUserActivity` call after authentication succeeds:

```typescript
import { updateUserActivity } from "../../logistic/services/logistic-notification.service.js";

export const authenticateUserMiddleware = (
    req: Request,
    _res: Response,
    next: NextFunction,
): void => {
    const token = getBearerToken(req.header("authorization"));

    if (!token) {
        next(new UnauthorizedError("Missing bearer token"));
        return;
    }

    try {
        const principal = tokenService.verifyAccessToken(token);
        req.authUser = principal;
        void updateUserActivity(principal.userId);  // ← add this line
        next();
    } catch {
        next(new UnauthorizedError("Invalid access token"));
    }
};
```

> `void` — activity tracking is non-blocking, best-effort. If Redis is temporarily unavailable
> the request still proceeds normally and idle detection degrades gracefully (treats user as idle).

---

## Implementation Order

These are independent fixes. Apply in any order.

1. Fix `ws-bridge.ts` + `notification-worker.ts` — together (Bug 1 spans two files)
2. Fix `ws-broadcaster.ts` — standalone (Bug 2)
3. Fix `authenticate-user.middleware.ts` — standalone (Bug 3)

After all three: run `npx tsc --noEmit` to confirm zero errors.

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] Notification worker WS dispatch: `logistic_batch_notification` only reaches `worker` role
  clients, not `admin`/`seller`/`manager` clients on the same shop
- [ ] `broadcastToShop` no longer generates unhandled promise rejections in logs when stale
  connections are cleaned up during a broadcast
- [ ] After a user makes any API request, the Redis key `iss:user:activity:{userId}` exists
  and its value is a recent timestamp
- [ ] A user who has made a recent API request is NOT notified by the BullMQ job (idle threshold
  not reached)
- [ ] A user who has been inactive longer than the threshold IS notified by the BullMQ job
