/**
 * Converts a base64url-encoded VAPID public key (as returned by the backend) into
 * the Uint8Array format required by PushManager.subscribe().
 */
export function vapidKeyToUint8Array(base64UrlKey: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64UrlKey.length % 4)) % 4);
  const base64 = (base64UrlKey + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
    .buffer as ArrayBuffer;
}

export function canUsePushNotifications(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}
