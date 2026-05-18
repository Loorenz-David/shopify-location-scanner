import { applyWaitingServiceWorkerController, registerPwaController, } from "../controllers/pwa.controller";
import { subscribeToPushController, unsubscribeFromPushController, } from "../controllers/push-notification.controller";
import { usePwaStore } from "../stores/pwa.store";
export const pwaActions = {
    async register() {
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
    dismissUpdatePrompt() {
        usePwaStore.getState().setUpdateAvailable(false);
    },
    applyUpdate() {
        const store = usePwaStore.getState();
        const registration = store.registration;
        if (!registration) {
            return;
        }
        store.setApplyingUpdate(true);
        const applied = applyWaitingServiceWorkerController(registration);
        if (!applied) {
            store.setApplyingUpdate(false);
            store.setUpdateAvailable(false);
        }
        // When applied, controllerchange fires in the controller and reloads the page.
    },
    async subscribeToPush(vapidPublicKey) {
        const subscribed = await subscribeToPushController(vapidPublicKey);
        usePwaStore.getState().setPushSubscribed(subscribed);
    },
    async unsubscribeFromPush() {
        await unsubscribeFromPushController();
        usePwaStore.getState().setPushSubscribed(false);
    },
};
