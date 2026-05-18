export function canUseServiceWorkers() {
    return typeof window !== "undefined" && "serviceWorker" in navigator;
}
export function hasWaitingServiceWorker(registration) {
    return registration.waiting !== null;
}
