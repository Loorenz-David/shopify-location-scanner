export function canUseServiceWorkers(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator;
}

export function hasWaitingServiceWorker(
  registration: ServiceWorkerRegistration,
): boolean {
  return registration.waiting !== null;
}
