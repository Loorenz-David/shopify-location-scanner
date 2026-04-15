import {
  applyWaitingServiceWorkerController,
  registerPwaController,
} from "../controllers/pwa.controller";
import {
  subscribeToPushController,
  unsubscribeFromPushController,
} from "../controllers/push-notification.controller";
import { usePwaStore } from "../stores/pwa.store";

export const pwaActions = {
  async register(): Promise<void> {
    await registerPwaController({
      onRegistered: (registration) => {
        usePwaStore.getState().setRegistration(registration);
        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (vapidKey) {
          void pwaActions.subscribeToPush(vapidKey);
        }
      },
      onNeedRefresh: (registration) => {
        const store = usePwaStore.getState();
        store.setRegistration(registration);
        store.setUpdateAvailable(true);
      },
    });
  },
  dismissUpdatePrompt(): void {
    usePwaStore.getState().setUpdateAvailable(false);
  },
  async applyUpdate(): Promise<void> {
    const store = usePwaStore.getState();
    const registration = store.registration;

    if (!registration) {
      return;
    }

    store.setApplyingUpdate(true);

    const hasAppliedWaitingWorker =
      await applyWaitingServiceWorkerController(registration);

    if (!hasAppliedWaitingWorker) {
      store.setApplyingUpdate(false);
      store.setUpdateAvailable(false);
      return;
    }

    window.location.reload();
  },
  async subscribeToPush(vapidPublicKey: string): Promise<void> {
    const subscribed = await subscribeToPushController(vapidPublicKey);
    usePwaStore.getState().setPushSubscribed(subscribed);
  },
  async unsubscribeFromPush(): Promise<void> {
    await unsubscribeFromPushController();
    usePwaStore.getState().setPushSubscribed(false);
  },
};
