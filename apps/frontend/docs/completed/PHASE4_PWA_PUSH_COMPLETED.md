# Phase 4 — PWA Push Notifications — Completed

**Source plan:** `docs/under_development/LOGISTIC_PWA_PUSH_PLAN.md`

---

## What was implemented

### Service Worker — `public/service-worker.js`

Appended two new event listeners (existing listeners untouched):

- **`push`** — parses JSON push payload, shows a notification with `tag: "logistic-notification"` (deduplication) and `renotify: true`. Falls back to a generic message if payload is absent.
- **`notificationclick`** — closes the notification and focuses (or opens) the app window.

---

### New: `src/features/pwa/domain/push-notification.domain.ts`

Pure utility functions, no side effects:

- `vapidKeyToUint8Array(base64UrlKey)` — converts base64url VAPID public key to `Uint8Array` for `PushManager.subscribe()`.
- `canUsePushNotifications()` — returns `false` if service workers, `PushManager`, or `Notification` API are unavailable (safe in all browsers).

---

### New: `src/features/pwa/types/push-notification.types.ts`

- `SavePushSubscriptionRequestDto` — `{ endpoint, p256dh, auth }` sent to backend on subscribe.
- `DeletePushSubscriptionRequestDto` — `{ endpoint }` sent to backend on unsubscribe.

---

### New: `src/features/pwa/api/save-push-subscription.api.ts`

`POST /logistic/push-subscription` with `requiresAuth: true`.

### New: `src/features/pwa/api/delete-push-subscription.api.ts`

`DELETE /logistic/push-subscription` with `requiresAuth: true`.

---

### Modified: `src/features/pwa/stores/pwa.store.ts`

Added `pushSubscribed: boolean` + `setPushSubscribed(value)` to the existing store.

---

### New: `src/features/pwa/controllers/push-notification.controller.ts`

**`subscribeToPushController(vapidPublicKey)`**

1. Guards: `canUsePushNotifications()` + `Notification.requestPermission()`.
2. Uses `navigator.serviceWorker.ready` (not the stored registration) to guarantee the worker is active.
3. If already subscribed: sends an idempotent upsert to the backend.
4. If not subscribed: calls `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` then saves to backend.
5. Returns `true` on success, `false` on permission denial or capability gap.

**`unsubscribeFromPushController()`**

1. Calls `DELETE /logistic/push-subscription` with the current endpoint (requires auth token — must be called before logout clears tokens).
2. Calls `subscription.unsubscribe()` in the `finally` block.

---

### Modified: `src/features/pwa/actions/pwa.actions.ts`

Added two actions to the existing `pwaActions` object:

- `subscribeToPush(vapidPublicKey)` — calls controller, stores result in `pushSubscribed`.
- `unsubscribeFromPush()` — calls controller, resets `pushSubscribed` to `false`.

---

### Modified: `src/features/bootstrap/controllers/bootstrap.controller.ts`

After `setPayload` and `hydrateLogisticLocationsFromBootstrap`, triggers push subscription:

```typescript
if (response.payload.vapidPublicKey) {
  void pwaActions.subscribeToPush(response.payload.vapidPublicKey);
}
```

Fire-and-forget (`void`) — push subscription is best-effort and never blocks bootstrap.

---

### Modified: `src/features/auth/controllers/auth.controller.ts`

Added the missing `logoutController()` export (was imported in `auth.actions.ts` but not defined):

```typescript
export async function logoutController(): Promise<void> {
  await pwaActions.unsubscribeFromPush(); // must run before tokens are cleared
  const refreshToken = tokenAuthController.getRefreshToken();
  try {
    if (refreshToken) await logoutApi({ refreshToken });
  } finally {
    clearAuthSessionController();
  }
}
```

---

## Key design decisions

| Decision                                                       | Rationale                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Push subscription triggered by bootstrap, not login            | Bootstrap already holds the VAPID key; avoids a second round-trip         |
| `navigator.serviceWorker.ready` instead of stored registration | Guarantees the worker is active; stored registration may be stale         |
| `unsubscribeFromPush` called before token clear                | DELETE endpoint requires a valid auth token                               |
| `void pwaActions.subscribeToPush(...)` in bootstrap            | Permission prompt or subscription failure must never crash bootstrap      |
| `tag: "logistic-notification"` on notifications                | Prevents notification stacking; newer push replaces older one in the tray |
