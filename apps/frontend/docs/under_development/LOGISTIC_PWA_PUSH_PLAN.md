# LOGISTIC_PWA_PUSH_PLAN — Frontend

## Purpose

Frontend implementation of Web Push notifications for the logistic system.
Companion to `apps/backend/docs/under_development/LOGISTIC_PWA_PUSH_PLAN.md` (backend must be
deployed first — provides the VAPID public key via bootstrap and the push subscription endpoints).

**Backend endpoints this plan depends on:**
- `POST /api/logistic/push-subscription` — save subscription
- `DELETE /api/logistic/push-subscription` — remove subscription
- `GET /api/bootstrap/payload` — now includes `vapidPublicKey: string`

---

## Architecture Rules

Follow the same conventions as the rest of the frontend:
- API clients in `features/<feature>/api/` — thin `apiClient` wrappers, return typed DTOs
- Controllers in `features/<feature>/controllers/` — orchestration, no UI
- Actions in `features/<feature>/actions/` — bridge between controllers and stores
- Stores in `features/<feature>/stores/` — Zustand, typed state
- Domain in `features/<feature>/domain/` — pure functions, no side effects
- Flows in `features/<feature>/flows/` — React hooks that wire stores + actions to components
- Types in `features/<feature>/types/` — DTOs and shared types

Push subscription logic lives in `features/pwa/` — it is a PWA-infrastructure concern, not a
logistic UI concern. The service worker is already registered by `features/pwa/controllers/pwa.controller.ts`.

---

## Existing infrastructure to build on

| File | Relevance |
|---|---|
| `public/service-worker.js` | Already handles caching. Add `push` + `notificationclick` here |
| `features/pwa/controllers/pwa.controller.ts` | Already calls `navigator.serviceWorker.register("/service-worker.js")`. Exposes `registration` via `onRegistered` |
| `features/pwa/actions/pwa.actions.ts` | `register()` already stores the registration in `usePwaStore` |
| `features/pwa/stores/pwa.store.ts` | Stores `ServiceWorkerRegistration`. The push controller reads it from here |
| `features/bootstrap/types/bootstrap.dto.ts` | Add `vapidPublicKey: string` to `BootstrapPayloadDto` |
| `features/bootstrap/controllers/bootstrap.controller.ts` | Trigger push subscription after successful bootstrap |
| `features/auth/controllers/auth.controller.ts` | Trigger push unsubscribe in `logoutController` |

---

## Step 1 — Extend `bootstrap.dto.ts`

File: `apps/frontend/src/features/bootstrap/types/bootstrap.dto.ts`

Add `vapidPublicKey` to `BootstrapPayloadDto`:

```typescript
export interface BootstrapPayloadDto {
  shopify: {
    metafields: BootstrapMetafieldsDto;
  };
  logisticLocations: LogisticLocationDto[];   // already added per LOGISTIC_LOCATION_CRUD_PLAN
  vapidPublicKey: string;                     // new field
}
```

> `LogisticLocationDto` type should be defined in `features/logistic/types/` once that feature is
> built. For now it can be inlined or defined as `unknown[]` until the logistic feature module exists.

---

## Step 2 — Extend Service Worker

File: `apps/frontend/public/service-worker.js`

Append these two event listeners to the end of the existing file. Do not modify existing listeners.

```javascript
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }

  const title = "Item Scanner";
  const options = {
    body: data.message ?? "You have pending logistic items",
    icon: "/web-app-manifest-192x192.png",
    badge: "/favicon-96x96.png",
    data: { url: "/logistic" },
    tag: "logistic-notification",   // replaces previous notification of same type
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/logistic";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            void client.navigate(targetUrl);
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});
```

> `tag: "logistic-notification"` means a second push silently replaces the first notification in
> the notification tray instead of stacking. `renotify: true` still plays a sound for the replacement.
> Remove `renotify` if silent replacement is preferred.

---

## Step 3 — Domain: `push-notification.domain.ts`

File: `apps/frontend/src/features/pwa/domain/push-notification.domain.ts`

Pure utility — no side effects, no imports.

```typescript
/**
 * Converts a base64url-encoded VAPID public key (as returned by the backend) into
 * the Uint8Array format required by PushManager.subscribe().
 */
export function vapidKeyToUint8Array(base64UrlKey: string): Uint8Array {
  const padding = "=".repeat((4 - (base64UrlKey.length % 4)) % 4);
  const base64 = (base64UrlKey + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function canUsePushNotifications(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}
```

---

## Step 4 — Types: `push-notification.types.ts`

File: `apps/frontend/src/features/pwa/types/push-notification.types.ts`

```typescript
export interface SavePushSubscriptionRequestDto {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface DeletePushSubscriptionRequestDto {
  endpoint: string;
}
```

---

## Step 5 — API Clients

### 5.1 Save subscription

File: `apps/frontend/src/features/pwa/api/save-push-subscription.api.ts`

```typescript
import { apiClient } from "../../../core/api-client";
import type { SavePushSubscriptionRequestDto } from "../types/push-notification.types";

export async function savePushSubscriptionApi(
  dto: SavePushSubscriptionRequestDto,
): Promise<void> {
  await apiClient.post("/logistic/push-subscription", dto);
}
```

### 5.2 Delete subscription

File: `apps/frontend/src/features/pwa/api/delete-push-subscription.api.ts`

```typescript
import { apiClient } from "../../../core/api-client";
import type { DeletePushSubscriptionRequestDto } from "../types/push-notification.types";

export async function deletePushSubscriptionApi(
  dto: DeletePushSubscriptionRequestDto,
): Promise<void> {
  await apiClient.delete("/logistic/push-subscription", { data: dto });
}
```

---

## Step 6 — Store: Push Subscription State

File: `apps/frontend/src/features/pwa/stores/pwa.store.ts`

Extend the existing store to track push subscription state:

```typescript
// Add to PwaStoreState interface:
pushSubscribed: boolean;
setPushSubscribed: (value: boolean) => void;

// Add to initial state in create():
pushSubscribed: false,
setPushSubscribed: (pushSubscribed) => set({ pushSubscribed }),
```

---

## Step 7 — Controller: `push-notification.controller.ts`

File: `apps/frontend/src/features/pwa/controllers/push-notification.controller.ts`

```typescript
import { vapidKeyToUint8Array, canUsePushNotifications } from "../domain/push-notification.domain";
import { savePushSubscriptionApi } from "../api/save-push-subscription.api";
import { deletePushSubscriptionApi } from "../api/delete-push-subscription.api";

export async function subscribeToPushController(
  vapidPublicKey: string,
): Promise<boolean> {
  if (!canUsePushNotifications()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration = await navigator.serviceWorker.ready;

  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) {
    // Already subscribed — ensure backend has it (idempotent upsert)
    const keys = existingSubscription.toJSON().keys;
    if (keys?.p256dh && keys?.auth) {
      await savePushSubscriptionApi({
        endpoint: existingSubscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });
    }
    return true;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidKeyToUint8Array(vapidPublicKey),
  });

  const sub = subscription.toJSON();
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return false;
  }

  await savePushSubscriptionApi({
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  });

  return true;
}

export async function unsubscribeFromPushController(): Promise<void> {
  if (!canUsePushNotifications()) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;

  // Remove from backend first, then from browser
  try {
    await deletePushSubscriptionApi({ endpoint });
  } finally {
    await subscription.unsubscribe();
  }
}
```

> `subscribeToPushController` handles the "already subscribed" case gracefully — calling it more
> than once is safe. Always calls `navigator.serviceWorker.ready` (not the stored registration)
> because ready guarantees the worker is active.

---

## Step 8 — Actions: Extend `pwa.actions.ts`

File: `apps/frontend/src/features/pwa/actions/pwa.actions.ts`

Add two new actions to the existing `pwaActions` object:

```typescript
import {
  subscribeToPushController,
  unsubscribeFromPushController,
} from "../controllers/push-notification.controller";
import { usePwaStore } from "../stores/pwa.store";

// Add to pwaActions:
async subscribeToPush(vapidPublicKey: string): Promise<void> {
  const subscribed = await subscribeToPushController(vapidPublicKey);
  usePwaStore.getState().setPushSubscribed(subscribed);
},

async unsubscribeFromPush(): Promise<void> {
  await unsubscribeFromPushController();
  usePwaStore.getState().setPushSubscribed(false);
},
```

---

## Step 9 — Bootstrap Integration

File: `apps/frontend/src/features/bootstrap/controllers/bootstrap.controller.ts`

After `bootstrapStore.setPayload(response.payload)`, trigger push subscription:

```typescript
import { pwaActions } from "../../pwa/actions/pwa.actions";

// Inside hydrateBootstrapController, in the try block after setPayload:
if (response.payload.vapidPublicKey) {
  void pwaActions.subscribeToPush(response.payload.vapidPublicKey);
}
```

> `void` — push subscription is best-effort. If the user denies permission or the browser doesn't
> support push, the app continues working. Never block bootstrap on push subscription.

---

## Step 10 — Logout Integration

File: `apps/frontend/src/features/auth/controllers/auth.controller.ts`

In `logoutController`, before clearing tokens:

```typescript
import { pwaActions } from "../../pwa/actions/pwa.actions";

export async function logoutController(): Promise<void> {
  // Unsubscribe from push before clearing tokens (needs auth to call DELETE endpoint)
  await pwaActions.unsubscribeFromPush();

  const refreshToken = tokenAuthController.getRefreshToken();
  try {
    if (refreshToken) {
      await logoutApi({ refreshToken });
    }
  } finally {
    clearAuthSessionController();
  }
}
```

> `unsubscribeFromPush` is wrapped in try/catch internally — if it fails (no subscription, network
> error) the logout still completes cleanly.

---

## Implementation Order

1. Step 1 — `bootstrap.dto.ts` (unblocks everything else)
2. Step 3 — `push-notification.domain.ts`
3. Step 4 — `push-notification.types.ts`
4. Step 5 — API clients
5. Step 6 — store extension
6. Step 7 — push-notification.controller.ts
7. Step 8 — actions extension
8. Step 2 — service worker (independent, can be done any time)
9. Step 9 — bootstrap integration (requires steps 1 + 7 + 8)
10. Step 10 — logout integration (requires steps 7 + 8)

---

## Validation Checklist

- [ ] `npm run build` passes with zero TypeScript errors after all steps
- [ ] `BootstrapPayloadDto` includes `vapidPublicKey: string`
- [ ] On first login, `Notification.requestPermission()` prompt appears
- [ ] After granting permission, `POST /api/logistic/push-subscription` is called with `endpoint`, `p256dh`, `auth`
- [ ] `subscribeToPushController` called twice does not create a duplicate subscription (idempotent)
- [ ] On logout, `DELETE /api/logistic/push-subscription` is called before tokens are cleared
- [ ] `canUsePushNotifications()` returns `false` gracefully in non-supporting browsers (no crash)
- [ ] Service worker `push` event handler fires when backend sends a push (test with `web-push` CLI)
- [ ] Notification displays the `message` from the push payload
- [ ] Clicking the notification opens (or focuses) `/logistic`
- [ ] `tag: "logistic-notification"` replaces previous notification instead of stacking
