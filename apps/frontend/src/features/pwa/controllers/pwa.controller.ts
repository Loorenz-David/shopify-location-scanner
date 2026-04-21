import {
  canUseServiceWorkers,
  hasWaitingServiceWorker,
} from "../domain/pwa-lifecycle.domain";
import type { RegisterPwaControllerArgs } from "../types/pwa.types";

const SERVICE_WORKER_URL = "/service-worker.js";

// Set to true when you are ready to re-enable the service worker.
const SERVICE_WORKER_ENABLED = true;

async function unregisterAllServiceWorkers(): Promise<void> {
  if (!canUseServiceWorkers()) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((r) => r.unregister()));
}

async function checkForServiceWorkerUpdate(
  registration: ServiceWorkerRegistration,
): Promise<void> {
  try {
    await registration.update();
  } catch {
    // Ignore transient update check failures and keep current worker active.
  }
}

export async function registerPwaController({
  onNeedRefresh,
  onRegistered,
}: RegisterPwaControllerArgs): Promise<void> {
  if (
    !SERVICE_WORKER_ENABLED ||
    !import.meta.env.PROD ||
    !canUseServiceWorkers()
  ) {
    await unregisterAllServiceWorkers();
    return;
  }

  const registration = await navigator.serviceWorker.register(
    SERVICE_WORKER_URL,
    {
      scope: "/",
      updateViaCache: "none",
    },
  );

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
      if (
        installingWorker.state === "installed" &&
        navigator.serviceWorker.controller
      ) {
        onNeedRefresh(registration);
      }
    });
  });
}

export async function applyWaitingServiceWorkerController(
  registration: ServiceWorkerRegistration,
): Promise<boolean> {
  if (!hasWaitingServiceWorker(registration)) {
    return false;
  }

  registration.waiting?.postMessage({ type: "SKIP_WAITING" });
  return true;
}
