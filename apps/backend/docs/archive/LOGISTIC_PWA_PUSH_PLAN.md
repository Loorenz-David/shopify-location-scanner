# LOGISTIC_PWA_PUSH_PLAN

## Purpose

Executable implementation plan for adding Web Push / PWA background notifications to the logistic
notification system. This is **Phase 6**, built directly on top of Phase 5 (already implemented).

**Reference:** `docs/completed/LOGISTIC_MANAGEMENT_IMPLEMENTATION_COMPLETED.md` (Phase 5 section)

Phase 5 already provides:
- `iss:user:activity:{userId}` Redis keys (24 h TTL) — idle detection is done
- `logistic-notification.service.ts` — `updateUserActivity`, `isUserIdle`, `scheduleRoleNotification`
- `notification-worker.ts` — processes BullMQ jobs, publishes `logistic_batch_notification` via WS
- `notification-queue.ts` — BullMQ queue `logistic-notifications` with prefix `iss`

**What this plan adds:**
1. VAPID key pair + env vars
2. `web-push` npm package
3. WS connection presence tracking in Redis (needed to decide WS vs push)
4. `PushSubscription` DB table + Prisma migration
5. `push-subscription.repository.ts`
6. `push-notification.service.ts` — sends Web Push API calls
7. Extend `notification-worker.ts` — send push when no active WS connection
8. Two new endpoints: `POST /logistic/push-subscription` and `DELETE /logistic/push-subscription`
9. Frontend: VAPID public key exposed via bootstrap, service worker, `PushManager.subscribe()` flow

---

## Architecture Rules

Same as all other modules:
- Repositories: const object with async methods + `toDomain()` mapper
- Contracts: Zod schemas + exported inferred types
- Controllers: const object with async handlers, `req.authUser` for auth context
- Routes: `asyncHandler` on every handler, `authenticateUserMiddleware` + `requireShopLinkMiddleware` at router level
- Errors: `NotFoundError`, `ValidationError` from `src/shared/errors/http-errors.ts`
- Logging: `logger.info` at start of every operation

---

## Decision: WS-first, Push-fallback

The notification worker already sends WS events. Push is the fallback for users with no open WS
connection. The routing logic:

```
For each idle user:
  → if user has an active WS connection → WS (already handled, no change)
  → else if user has a push subscription → send Web Push
  → else → skip
```

WS connection presence is tracked in a Redis set per shop+role so the worker can check it without
querying the DB.

---

## Step 1 — VAPID Key Generation (one-time, manual)

VAPID keys are generated **once** per deployment, stored in env, never rotated unless compromised.

### 1.1 Generate the key pair

```bash
npx web-push generate-vapid-keys
```

Output:
```
Public Key: <BASE64URL>
Private Key: <BASE64URL>
```

### 1.2 Add to env files

File: `apps/backend/.env`
```
VAPID_PUBLIC_KEY=<your-generated-public-key>
VAPID_PRIVATE_KEY=<your-generated-private-key>
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

File: `apps/backend/.env.example`
```
VAPID_PUBLIC_KEY=          # generate with: npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

File: `apps/backend/.env.production.example`
```
VAPID_PUBLIC_KEY=          # generate once per deployment
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

### 1.3 Register in `src/config/env.ts`

Add these three fields to `EnvSchema`:

```typescript
VAPID_PUBLIC_KEY: z.string().min(1),
VAPID_PRIVATE_KEY: z.string().min(1),
VAPID_SUBJECT: z.string().min(1),
```

---

## Step 2 — Install `web-push`

```bash
cd apps/backend && npm install web-push && npm install --save-dev @types/web-push
```

---

## Step 3 — WS Connection Presence Tracking in Redis

The notification worker needs to know which users currently have an open WebSocket connection. Track
this with a Redis set per shop: `iss:ws:online:{shopId}` → set of `userId` strings.

### 3.1 Update `src/modules/ws/ws-registry.ts`

The registry already stores `WsConnection = { ws, role, userId }`. Add two Redis calls:
- On `registerConnection`: `SADD iss:ws:online:{shopId} {userId}`
- On `removeConnection`: when no more connections exist for that user in that shop, `SREM iss:ws:online:{shopId} {userId}`

Import a Redis client (reuse the pattern from `logistic-notification.service.ts`):

```typescript
import { Redis } from "ioredis";
import { env } from "../../config/env.js";

const presenceClient = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });

const WS_PRESENCE_TTL_SECONDS = 3600; // 1 hour safety expiry
```

In `registerConnection`, after adding to the in-memory map:
```typescript
await presenceClient.sadd(`iss:ws:online:${shopId}`, userId);
await presenceClient.expire(`iss:ws:online:${shopId}`, WS_PRESENCE_TTL_SECONDS);
```

In `removeConnection`, after removing from the in-memory map, check if any connection
remains for that user in that shop. If none:
```typescript
await presenceClient.srem(`iss:ws:online:${shopId}`, userId);
```

> The TTL on the set is a safety net only. Connections are managed explicitly. Do not rely on
> TTL for correctness — only for crash recovery.

### 3.2 Export a presence check helper

Add and export from `ws-registry.ts`:

```typescript
export const isUserConnectedViaWs = async (
  shopId: string,
  userId: string,
): Promise<boolean> => {
  const isMember = await presenceClient.sismember(`iss:ws:online:${shopId}`, userId);
  return isMember === 1;
};
```

---

## Step 4 — Database: `PushSubscription` Model

File: `prisma/schema.prisma`

Add this model. No new enums needed.

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

Add the reverse relation on `User`:

```prisma
model User {
  // ... existing fields ...
  pushSubscriptions PushSubscription[]
}
```

### 4.1 Create the migration

```bash
cd apps/backend && npx prisma migrate dev --name add_push_subscription
```

---

## Step 5 — Repository: `push-subscription.repository.ts`

File: `apps/backend/src/modules/logistic/repositories/push-subscription.repository.ts`

```typescript
import { prisma } from "../../../shared/database/prisma-client.js";

export type PushSubscriptionRecord = {
  id: string;
  userId: string;
  shopId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const toDomain = (record: {
  id: string;
  userId: string;
  shopId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): PushSubscriptionRecord => ({
  id: record.id,
  userId: record.userId,
  shopId: record.shopId,
  endpoint: record.endpoint,
  p256dh: record.p256dh,
  auth: record.auth,
});

const SELECT = {
  id: true,
  userId: true,
  shopId: true,
  endpoint: true,
  p256dh: true,
  auth: true,
} as const;

export const pushSubscriptionRepository = {
  async upsert(input: {
    userId: string;
    shopId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }): Promise<PushSubscriptionRecord> {
    const record = await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId: input.userId, endpoint: input.endpoint } },
      update: { p256dh: input.p256dh, auth: input.auth },
      create: {
        userId: input.userId,
        shopId: input.shopId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      },
      select: SELECT,
    });

    return toDomain(record);
  },

  async deleteByEndpoint(input: {
    userId: string;
    endpoint: string;
  }): Promise<boolean> {
    const existing = await prisma.pushSubscription.findUnique({
      where: { userId_endpoint: { userId: input.userId, endpoint: input.endpoint } },
    });

    if (!existing) return false;

    await prisma.pushSubscription.delete({
      where: { userId_endpoint: { userId: input.userId, endpoint: input.endpoint } },
    });

    return true;
  },

  async findByUser(input: { userId: string }): Promise<PushSubscriptionRecord[]> {
    const records = await prisma.pushSubscription.findMany({
      where: { userId: input.userId },
      select: SELECT,
    });

    return records.map(toDomain);
  },

  async findByShopAndRole(input: {
    shopId: string;
    role: string;
  }): Promise<PushSubscriptionRecord[]> {
    // Join through User to filter by role
    const records = await prisma.pushSubscription.findMany({
      where: {
        shopId: input.shopId,
        user: { role: input.role as any },
      },
      select: SELECT,
    });

    return records.map(toDomain);
  },
};
```

---

## Step 6 — Service: `push-notification.service.ts`

File: `apps/backend/src/modules/logistic/services/push-notification.service.ts`

This service is the only place that imports and calls `web-push`. All VAPID setup happens here.

```typescript
import webpush from "web-push";
import { env } from "../../../config/env.js";
import { logger } from "../../../shared/logging/logger.js";
import type { PushSubscriptionRecord } from "../repositories/push-subscription.repository.js";

webpush.setVapidDetails(
  env.VAPID_SUBJECT,
  env.VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY,
);

export type PushPayload = {
  type: string;
  count: number;
  itemIds: string[];
  message: string;
};

export const sendPushNotification = async (
  subscription: PushSubscriptionRecord,
  payload: PushPayload,
): Promise<"sent" | "expired"> => {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
    );

    return "sent";
  } catch (err: any) {
    // HTTP 410 Gone = subscription has been revoked by the browser
    if (err.statusCode === 410) {
      logger.info("Push subscription expired (410), should be deleted", {
        userId: subscription.userId,
        endpoint: subscription.endpoint,
      });
      return "expired";
    }

    logger.error("Push notification failed", {
      userId: subscription.userId,
      error: err.message,
    });

    // Re-throw for non-410 errors so the caller can decide whether to retry
    throw err;
  }
};
```

> `sendPushNotification` returns `"expired"` for 410 responses. The caller (notification worker)
> deletes the expired subscription from the DB. Never delete inside this service — keep it pure.

---

## Step 7 — Extend `notification-worker.ts`

File: `apps/backend/src/workers/notification-worker.ts`

Extend the existing worker to send push notifications for idle users without a WS connection.

### Full updated worker logic (replace the existing `Worker` callback body):

```typescript
import { isUserConnectedViaWs } from "../modules/ws/ws-registry.js";
import {
  sendPushNotification,
  type PushPayload,
} from "../modules/logistic/services/push-notification.service.js";
import { pushSubscriptionRepository } from "../modules/logistic/repositories/push-subscription.repository.js";
```

Inside the worker `async (job) => { ... }` callback, after the existing pending items count and
before the `wsBroadcastPublisher.publish(...)` call, split by delivery channel:

```typescript
const payload: PushPayload = {
  type: "logistic_batch_notification",
  count,
  itemIds,
  message,
};

// Separate users into WS-connected vs push-eligible
const wsUsers: string[] = [];
const pushUsers: typeof users = [];

for (let i = 0; i < users.length; i++) {
  const user = users[i];
  if (!idleChecks[i]) continue; // skip non-idle users

  const isConnected = await isUserConnectedViaWs(shopId, user.id);
  if (isConnected) {
    wsUsers.push(user.id);
  } else {
    pushUsers.push(user);
  }
}

// WS delivery (existing channel — unchanged)
if (wsUsers.length > 0) {
  await wsBroadcastPublisher.publish(shopId, {
    ...payload,
    targetRoles: [role],
  } as any);
  logger.info("WS notification dispatched", { shopId, role, count, wsUsers });
}

// Push delivery (new channel)
for (const user of pushUsers) {
  const subscriptions = await pushSubscriptionRepository.findByUser({ userId: user.id });

  for (const sub of subscriptions) {
    const result = await sendPushNotification(sub, payload);

    if (result === "expired") {
      await pushSubscriptionRepository.deleteByEndpoint({
        userId: user.id,
        endpoint: sub.endpoint,
      });
    }
  }
}

if (pushUsers.length > 0) {
  logger.info("Push notification dispatched", { shopId, role, count, pushUserCount: pushUsers.length });
}
```

> Replace the old `const hasIdleUsers = idleChecks.some(Boolean)` early-return check.
> The new logic individually classifies each idle user by channel instead of aborting early.

---

## Step 8 — Extend Contracts

File: `apps/backend/src/modules/logistic/contracts/logistic.contract.ts`

Add these schemas and types. Do not duplicate anything already defined.

```typescript
// Push subscription management
export const SavePushSubscriptionInputSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export const DeletePushSubscriptionInputSchema = z.object({
  endpoint: z.string().url(),
});

export type SavePushSubscriptionInput = z.infer<typeof SavePushSubscriptionInputSchema>;
export type DeletePushSubscriptionInput = z.infer<typeof DeletePushSubscriptionInputSchema>;
```

---

## Step 9 — Add Controller Methods

File: `apps/backend/src/modules/logistic/controllers/logistic.controller.ts`

Add these two handlers to the existing `logisticController` object.

```typescript
savePushSubscription: async (req: Request, res: Response): Promise<void> => {
  logger.info("Save push subscription", { userId: req.authUser.userId });

  const input = SavePushSubscriptionInputSchema.parse(req.body);

  await pushSubscriptionRepository.upsert({
    userId: req.authUser.userId as string,
    shopId: req.authUser.shopId as string,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
  });

  res.status(200).json({ ok: true });
},

deletePushSubscription: async (req: Request, res: Response): Promise<void> => {
  logger.info("Delete push subscription", { userId: req.authUser.userId });

  const input = DeletePushSubscriptionInputSchema.parse(req.body);

  await pushSubscriptionRepository.deleteByEndpoint({
    userId: req.authUser.userId as string,
    endpoint: input.endpoint,
  });

  res.status(200).json({ ok: true });
},
```

> `deletePushSubscription` does not throw `NotFoundError` on missing subscription — deleting a
> non-existent subscription is idempotent (browser may already have cleaned it up).

---

## Step 10 — Register Routes

File: `apps/backend/src/modules/logistic/routes/logistic.routes.ts`

Add after existing routes:

```typescript
logisticRouter.post(
  "/push-subscription",
  asyncHandler(logisticController.savePushSubscription),
);

logisticRouter.delete(
  "/push-subscription",
  asyncHandler(logisticController.deletePushSubscription),
);
```

---

## Step 11 — Expose VAPID Public Key via Bootstrap

The frontend needs the VAPID public key to call `PushManager.subscribe()`. Add it to the bootstrap
payload — it is public by design (never the private key).

### 11.1 Update `apps/backend/src/modules/bootstrap/contracts/bootstrap.contract.ts`

```typescript
export type BootstrapPayload = {
  shopify: {
    metafields: ShopifyMetafieldOptionsDto;
  };
  logisticLocations: LogisticLocationDto[];
  vapidPublicKey: string;           // new field
};
```

### 11.2 Update `apps/backend/src/modules/bootstrap/queries/build-bootstrap-payload.query.ts`

```typescript
import { env } from "../../../config/env.js";

export const buildBootstrapPayloadQuery = async (input: {
  shopId: string;
}): Promise<BootstrapPayload> => {
  const [metafields, logisticLocations] = await Promise.all([
    getMetafieldOptionsQuery({ shopId: input.shopId }),
    getLogisticLocationsQuery({ shopId: input.shopId }),
  ]);

  return {
    shopify: { metafields },
    logisticLocations,
    vapidPublicKey: env.VAPID_PUBLIC_KEY,
  };
};
```

---

## Step 12 — Frontend Implementation

> Frontend plan is in a separate document:
> `apps/frontend/docs/under_development/LOGISTIC_PWA_PUSH_PLAN.md`

Key integration points the frontend plan covers:
- Extend existing `public/service-worker.js` with `push` + `notificationclick` event handlers
- `features/pwa/domain/push-notification.domain.ts` — `vapidKeyToUint8Array`, `canUsePushNotifications`
- `features/pwa/controllers/push-notification.controller.ts` — subscribe + unsubscribe
- `features/pwa/actions/pwa.actions.ts` — `subscribeToPush`, `unsubscribeFromPush` added
- `features/bootstrap/types/bootstrap.dto.ts` — add `vapidPublicKey: string` to `BootstrapPayloadDto`
- `features/bootstrap/controllers/bootstrap.controller.ts` — call `pwaActions.subscribeToPush` after payload loads
- `features/auth/controllers/auth.controller.ts` — call `pwaActions.unsubscribeFromPush` before logout

---

## Validation Checklist

- [ ] `npx web-push generate-vapid-keys` output stored in `.env` with all three vars
- [ ] `npx tsc --noEmit` passes with zero errors after all steps
- [ ] `npx prisma migrate dev` creates `PushSubscription` table with correct columns and indexes
- [ ] `GET /api/bootstrap/payload` includes `vapidPublicKey` string
- [ ] `POST /api/logistic/push-subscription` with valid `{ endpoint, p256dh, auth }` returns `200 { ok: true }`
- [ ] `POST /api/logistic/push-subscription` called twice with same endpoint upserts (no duplicate row)
- [ ] `DELETE /api/logistic/push-subscription` with existing endpoint returns `200 { ok: true }`
- [ ] `DELETE /api/logistic/push-subscription` with non-existent endpoint returns `200 { ok: true }` (idempotent)
- [ ] Notification worker: user with active WS connection receives WS event only, not a push
- [ ] Notification worker: idle user with no WS connection but with push subscription receives push
- [ ] Notification worker: expired subscription (browser returns 410) is deleted from DB automatically
- [ ] Frontend: service worker registers at `/sw.js`
- [ ] Frontend: `Notification.requestPermission()` is called before subscribing
- [ ] Frontend: push notification click navigates to `/logistic`
- [ ] Frontend: logout unsubscribes from push and calls `DELETE /api/logistic/push-subscription`
- [ ] WS connection set (`iss:ws:online:{shopId}`) is populated on connect, cleaned on disconnect
- [ ] WS set TTL of 1 hour is refreshed on each new connection for that shop

---

## Implementation Order

Follow this order to avoid circular dependency issues during compile:

1. Step 1 (VAPID env vars) — no code yet, just env setup
2. Step 2 (install `web-push`)
3. Step 3 (WS presence tracking)
4. Step 4 (Prisma schema + migration)
5. Step 5 (push-subscription.repository.ts)
6. Step 6 (push-notification.service.ts)
7. Step 8 (contracts)
8. Step 9 (controller methods)
9. Step 10 (routes)
10. Step 11 (bootstrap)
11. Step 7 (notification-worker.ts) — last, depends on steps 3, 5, 6
12. Frontend — see `apps/frontend/docs/under_development/LOGISTIC_PWA_PUSH_PLAN.md` (independent, can be done in parallel with backend steps)
