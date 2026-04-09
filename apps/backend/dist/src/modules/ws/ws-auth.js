import { tokenService } from "../auth/integrations/token.service.js";
const AUTH_TIMEOUT_MS = 5_000;
const AUTH_FAILED_CLOSE_CODE = 4001;
export const waitForAuth = (ws) => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            ws.close(AUTH_FAILED_CLOSE_CODE, "Auth timeout");
            resolve({ ok: false });
        }, AUTH_TIMEOUT_MS);
        ws.once("message", (raw) => {
            clearTimeout(timeout);
            try {
                const message = JSON.parse(raw.toString());
                if (message.type !== "auth" || typeof message.token !== "string") {
                    ws.close(AUTH_FAILED_CLOSE_CODE, "Expected auth message");
                    resolve({ ok: false });
                    return;
                }
                const principal = tokenService.verifyAccessToken(message.token);
                if (!principal.shopId) {
                    ws.close(AUTH_FAILED_CLOSE_CODE, "Shop not linked");
                    resolve({ ok: false });
                    return;
                }
                resolve({
                    ok: true,
                    shopId: principal.shopId,
                    userId: principal.userId,
                });
            }
            catch {
                ws.close(AUTH_FAILED_CLOSE_CODE, "Invalid auth payload");
                resolve({ ok: false });
            }
        });
        ws.once("close", () => {
            clearTimeout(timeout);
            resolve({ ok: false });
        });
    });
};
//# sourceMappingURL=ws-auth.js.map