import {
  canUseServiceWorkers,
  hasWaitingServiceWorker,
} from "../domain/pwa-lifecycle.domain";
import type { RegisterPwaControllerArgs } from "../types/pwa.types";

const SERVICE_WORKER_URL = "/service-worker.js";

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
  if (!import.meta.env.PROD || !canUseServiceWorkers()) {
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
