import {
  canUsePushNotifications,
  vapidKeyToUint8Array,
} from "../domain/push-notification.domain";
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
    // Already subscribed — ensure the backend has an up-to-date record (idempotent).
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

  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) return;

  const subscription = await registrations[0]!.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;

  // Remove from backend first (requires auth); then remove from browser.
  try {
    await deletePushSubscriptionApi({ endpoint });
  } finally {
    await subscription.unsubscribe();
  }
}
