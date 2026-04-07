import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "../../../config/env.js";
export const shopifyOauthStateService = {
    sign(userId) {
        const payload = {
            nonce: randomUUID(),
            userId,
            issuedAt: Date.now(),
        };
        return jwt.sign(payload, env.JWT_SECRET);
    },
    verify(state) {
        return jwt.verify(state, env.JWT_SECRET);
    },
};
//# sourceMappingURL=shopify-oauth-state.service.js.map