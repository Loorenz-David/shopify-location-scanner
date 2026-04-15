# Logistic PWA Push Notifications — Phase 6 Completed

## Source Plan

`docs/under_development/LOGISTIC_PWA_PUSH_PLAN.md`

## Built On

Phase 5 (`docs/completed/LOGISTIC_MANAGEMENT_IMPLEMENTATION_COMPLETED.md`) — idle detection, BullMQ
notification queue, and WS broadcasting were already in place. Phase 6 adds Web Push as a
fallback channel for users without an active WebSocket connection.

---

## Architecture

```
Notification worker (BullMQ job)
  └─ for each idle user:
       ├─ user has active WS connection?  → publish WS event (unchanged)
       └─ user has no WS connection?      → send Web Push via web-push library
            └─ subscription returned 410? → auto-delete expired record from DB
```

WS connection presence is tracked in Redis sets (`iss:ws:online:{shopId}`) so the worker can
decide delivery channel without a DB query per user.

---

## Step 1 — VAPID Keys

**Files:** `.env`, `.env.example`, `.env.production.example`, `src/config/env.ts`

Generated with `npx web-push generate-vapid-keys`. Three env vars registered in `EnvSchema`:

```typescript
VAPID_PUBLIC_KEY: z.string().min(1),
VAPID_PRIVATE_KEY: z.string().min(1),
VAPID_SUBJECT: z.string().min(1),
```

`.env.example` and `.env.production.example` updated with blank placeholders and generation
instructions. VAPID keys are generated once per deployment and never rotated unless compromised.

---

## Step 2 — Package Installation

```bash
npm install web-push
npm install --save-dev @types/web-push
```

`web-push` is the only place that calls the Web Push API. All VAPID setup is isolated in
`push-notification.service.ts`.

---

## Step 3 — WS Connection Presence Tracking

**File:** `src/modules/ws/ws-registry.ts`

Added a dedicated `ioredis` client (`presenceClient`) to track online users per shop in a Redis
set. `registerConnection` and `removeConnection` are now `async`.

### Redis key

```
iss:ws:online:{shopId}  →  Set<userId>
TTL: 3600 s (safety net for crash recovery; membership is managed explicitly)
```

### Logic

- `registerConnection`: `SADD + EXPIRE` after adding to in-memory map
- `removeConnection`: `SREM` only when no other connection for that user remains in the shop
- New export: `isUserConnectedViaWs(shopId, userId): Promise<boolean>` — used by notification
  worker

### `ws-server.ts` changes

- `registerConnection` call: `await`
- Ping-timer `setInterval` callback: wrapped in `void (async () => { ... })()` so `await
removeConnection` is valid inside the sync callback
- `ws.on("close")` / `ws.on("error")`: `void removeConnection(...)` (fire-and-forget on socket
  events, safe because presence cleanup is best-effort)

---

## Step 4 — Database: `PushSubscription` Model

**File:** `prisma/schema.prisma`

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  shopId    String
  endpoint  String
  p256dh    String
  auth      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, endpoint])
  @@index([shopId])
  @@index([userId])
}
```

`User` model extended with `pushSubscriptions PushSubscription[]` reverse relation.

**Migration applied:** `20260415050853_add_push_subscription`

---

## Step 5 — Repository: `push-subscription.repository.ts`

**File:** `src/modules/logistic/repositories/push-subscription.repository.ts`

Follows project convention: const object, `toDomain()` mapper, `SELECT` projection constant,
never throws on not-found.

### Methods

| Method              | Signature                                    | Returns                       |
| ------------------- | -------------------------------------------- | ----------------------------- |
| `upsert`            | `{ userId, shopId, endpoint, p256dh, auth }` | `PushSubscriptionRecord`      |
| `deleteByEndpoint`  | `{ userId, endpoint }`                       | `boolean` (false = not found) |
| `findByUser`        | `{ userId }`                                 | `PushSubscriptionRecord[]`    |
| `findByShopAndRole` | `{ shopId, role }`                           | `PushSubscriptionRecord[]`    |

`upsert` uses Prisma's `upsert` on the `@@unique([userId, endpoint])` constraint — calling the
endpoint twice never creates a duplicate row.

`findByShopAndRole` joins through `User` to filter by role (used for future bulk targeting).

---

## Step 6 — Service: `push-notification.service.ts`

**File:** `src/modules/logistic/services/push-notification.service.ts`

Sole owner of the `web-push` import. VAPID details set once at module load.

```typescript
export const sendPushNotification = async (
  subscription: PushSubscriptionRecord,
  payload: PushPayload,
): Promise<"sent" | "expired">
```

- Returns `"sent"` on success
- Returns `"expired"` on HTTP 410 — caller is responsible for deleting the record
- Re-throws all other errors so BullMQ can retry the job

### Payload shape

```typescript
type PushPayload = {
  type: string; // "logistic_batch_notification"
  count: number;
  itemIds: string[];
  message: string;
};
```

---

## Step 7 — Contracts

**File:** `src/modules/logistic/contracts/logistic.contract.ts`

Two new Zod schemas and inferred types added:

```typescript
export const SavePushSubscriptionInputSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export const DeletePushSubscriptionInputSchema = z.object({
  endpoint: z.string().url(),
});

export type SavePushSubscriptionInput = z.infer<
  typeof SavePushSubscriptionInputSchema
>;
export type DeletePushSubscriptionInput = z.infer<
  typeof DeletePushSubscriptionInputSchema
>;
```

---

## Step 8 — Controller Methods

**File:** `src/modules/logistic/controllers/logistic.controller.ts`

Two handlers added to the existing `logisticController` object:

### `savePushSubscription`

- Parses `SavePushSubscriptionInputSchema`
- Calls `pushSubscriptionRepository.upsert(...)` — idempotent on re-subscription
- Returns `200 { ok: true }`

### `deletePushSubscription`

- Parses `DeletePushSubscriptionInputSchema`
- Calls `pushSubscriptionRepository.deleteByEndpoint(...)` — does **not** throw on missing
  (browser may have already cleaned it up)
- Returns `200 { ok: true }`

---

## Step 9 — Routes

**File:** `src/modules/logistic/routes/logistic.routes.ts`

```
POST   /api/logistic/push-subscription   → savePushSubscription
DELETE /api/logistic/push-subscription   → deletePushSubscription
```

Both routes inherit `authenticateUserMiddleware` + `requireShopLinkMiddleware` from the router.

---

## Step 10 — Bootstrap: VAPID Public Key

**Files:** `src/modules/bootstrap/contracts/bootstrap.contract.ts`,
`src/modules/bootstrap/queries/build-bootstrap-payload.query.ts`

`BootstrapPayload` extended:

```typescript
vapidPublicKey: string;
```

`buildBootstrapPayloadQuery` reads `env.VAPID_PUBLIC_KEY` and includes it in the payload. The
public key is safe to expose — it is required by the browser to call `PushManager.subscribe()`.
The private key is never sent to any client.

---

## Step 11 — Notification Worker: WS-first, Push-fallback

**File:** `src/workers/notification-worker.ts`

New imports:

```typescript
import { isUserConnectedViaWs } from "../modules/ws/ws-registry.js";
import {
  sendPushNotification,
  type PushPayload,
} from "../modules/logistic/services/push-notification.service.js";
import { pushSubscriptionRepository } from "../modules/logistic/repositories/push-subscription.repository.js";
```

### Updated dispatch logic (replaces the single `wsBroadcastPublisher.publish` call)

```
For each idle user:
  isUserConnectedViaWs(shopId, userId)?
    yes → add to wsUserIds list
    no  → add to pushUsers list

if wsUserIds.length > 0:
  wsBroadcastPublisher.publish(...)   ← existing WS channel, unchanged

for each pushUser:
  subs = pushSubscriptionRepository.findByUser({ userId })
  for each sub:
    result = sendPushNotification(sub, payload)
    if result === "expired":
      pushSubscriptionRepository.deleteByEndpoint(...)
```

The `hasIdleUsers` early-return guard is preserved — if no users are idle the worker still
exits early without hitting the DB for pending items.

---

## Compile Status

`npx tsc --noEmit` — **0 errors**

---

## Frontend Handoff (Step 12 — not in this workspace)

The frontend needs to implement:

1. Service worker at `/public/sw.js` handling `push` and `notificationclick` events
2. SW registration on app init: `navigator.serviceWorker.register("/sw.js")`
3. Subscription flow after login: `Notification.requestPermission()` → `PushManager.subscribe()`
   using `vapidPublicKey` from bootstrap → `POST /api/logistic/push-subscription`
4. Unsubscribe on logout: `PushManager.getSubscription()` → `DELETE /api/logistic/push-subscription`
   → `subscription.unsubscribe()`

Helper required by the frontend to convert the VAPID public key:

```typescript
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
```

---

## Post-Implementation Bug Fixes

Three runtime bugs discovered during post-implementation review and fixed in the same session.
Source plan: `docs/under_development/LOGISTIC_POST_IMPLEMENTATION_FIXES.md`.

---

### Bug 1 — CRITICAL: Role-targeted WS notifications went to all users

**Root cause:** `createWsBroadcastPublisher().publish()` in `src/shared/queue/ws-bridge.ts`
only accepted `(shopId, event)`. The notification worker was stuffing `targetRoles` into the
event body as a workaround:

```typescript
// broken
await wsBroadcastPublisher.publish(shopId, {
  ...payload,
  targetRoles: [role],
} as any);
```

When the subscriber deserialised the Redis message it read `parsed.targetRoles` from the
top-level object, which was always `undefined`. Result: `broadcastToShop` sent
`logistic_batch_notification` to **all** connected users for the shop, ignoring role.

**Fix — `src/shared/queue/ws-bridge.ts`:**

`publish` now accepts an optional `targetRoles?: string[]` third argument and serialises it
at the message top level:

```typescript
const publish = async (
  shopId: string,
  event: WsBroadcastMessage["event"],
  targetRoles?: string[],
): Promise<void> => {
  const message: WsBroadcastMessage = {
    shopId,
    event,
    ...(targetRoles ? { targetRoles } : {}),
  };
  await client.publish(WS_BROADCAST_CHANNEL, JSON.stringify(message));
};
```

**Fix — `src/workers/notification-worker.ts`:**

Removed the `as any` workaround; `targetRoles` now passed as the clean third argument:

```typescript
await wsBroadcastPublisher.publish(shopId, payload, [role]);
```

Backwards-compatible — all other callers that pass only 2 args are unaffected.

---

### Bug 2 — Floating promise on stale WS connection cleanup

**Root cause:** `broadcastToShop` in `src/modules/ws/ws-broadcaster.ts` is synchronous. After
`removeConnection` became `async` (Phase 6, Redis `SREM`), calling it without `await` or `void`
created an unhandled promise — suppressing errors and potentially leaving stale entries in the
Redis presence set.

**Fix — `src/modules/ws/ws-broadcaster.ts`:**

Prefixed with `void` to make fire-and-forget intent explicit:

```typescript
void removeConnection(shopId, ws);
logger.info("WS: removed stale connection", { shopId });
```

`broadcastToShop` remains synchronous by design (called from request handlers). Fire-and-forget
is correct here — stale connection cleanup is best-effort.

---

### Bug 3 — `updateUserActivity` never called; idle detection always returned true

**Root cause:** `updateUserActivity` was implemented in Phase 5
(`logistic-notification.service.ts`) but never wired up. The Redis key
`iss:user:activity:{userId}` was never written, so `isUserIdle` always returned `true`
(missing key → treated as idle). Every BullMQ job notified **all** users of the target role
regardless of recent activity.

**Fix — `src/modules/auth/middleware/authenticate-user.middleware.ts`:**

Fire-and-forget `updateUserActivity` call added after every successful token verification:

```typescript
import { updateUserActivity } from "../../logistic/services/logistic-notification.service.js";

// inside authenticateUserMiddleware, after verifyAccessToken:
req.authUser = principal;
void updateUserActivity(principal.userId); // ← non-blocking, Redis-failure-safe
next();
```

If Redis is temporarily unavailable the request still proceeds normally and idle detection
degrades gracefully (treats user as idle).

---

### Compile Status After Fixes

`npx tsc --noEmit` — **0 errors**
