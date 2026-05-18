import { canUseServiceWorkers, hasWaitingServiceWorker, } from "../domain/pwa-lifecycle.domain";
const SERVICE_WORKER_URL = "/service-worker.js";
// Set to true when you are ready to re-enable the service worker.
const SERVICE_WORKER_ENABLED = true;
async function unregisterAllServiceWorkers() {
    if (!canUseServiceWorkers())
        return;
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
}
async function checkForServiceWorkerUpdate(registration) {
    try {
        await registration.update();
    }
    catch {
        // Ignore transient update check failures and keep current worker active.
    }
}
export async function registerPwaController({ onNeedRefresh, onRegistered, }) {
    if (!SERVICE_WORKER_ENABLED ||
        !import.meta.env.PROD ||
        !canUseServiceWorkers()) {
        await unregisterAllServiceWorkers();
        return;
    }
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
        scope: "/",
        updateViaCache: "none",
    });
    await checkForServiceWorkerUpdate(registration);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            void checkForServiceWorkerUpdate(registration);
        }
    });
    onRegistered?.(registration);
    if (hasWaitingServiceWorker(registration)) {
        onNeedRefresh(registration);
    }
    registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) {
            return;
        }
        installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed" &&
                navigator.serviceWorker.controller) {
                onNeedRefresh(registration);
            }
        });
    });
}
export function applyWaitingServiceWorkerController(registration) {
    if (!hasWaitingServiceWorker(registration)) {
        return false;
    }
    // Reload only after the new SW has actually taken control, not immediately
    // after posting SKIP_WAITING (which is async).
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
    return true;
}
