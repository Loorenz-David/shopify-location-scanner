import { connectWsClient, disconnectWsClient, tokenAuthController, } from "../../../core/api-client";
import { clearAuthSessionController, hydrateAuthSessionController, loginController, logoutController, registerController, appEnterController, appLeaveController, } from "../controllers/auth.controller";
export const authActions = {
    async login(payload) {
        const user = await loginController(payload);
        connectWsClient(() => tokenAuthController.getAccessToken());
        return user;
    },
    async register(payload) {
        const user = await registerController(payload);
        connectWsClient(() => tokenAuthController.getAccessToken());
        return user;
    },
    async hydrateSession() {
        const user = await hydrateAuthSessionController();
        if (user) {
            connectWsClient(() => tokenAuthController.getAccessToken());
        }
        else {
            disconnectWsClient();
        }
        return user;
    },
    async logout() {
        await logoutController();
        disconnectWsClient();
    },
    clearSession() {
        clearAuthSessionController();
        disconnectWsClient();
    },
    async appEnter() {
        await appEnterController();
    },
    async appLeave() {
        await appLeaveController();
    },
};
