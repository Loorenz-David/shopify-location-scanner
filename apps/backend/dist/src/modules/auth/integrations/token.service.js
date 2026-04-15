import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { env } from "../../../config/env.js";
const ACCESS_TOKEN_TYPE = "access";
export const tokenService = {
    createAccessToken(principal) {
        const payload = {
            userId: principal.userId,
            username: principal.username,
            role: principal.role,
            shopId: principal.shopId,
            tokenVersion: principal.tokenVersion,
            type: ACCESS_TOKEN_TYPE,
        };
        return jwt.sign(payload, env.JWT_SECRET);
    },
    verifyAccessToken(token) {
        const payload = jwt.verify(token, env.JWT_SECRET);
        if (payload.type !== ACCESS_TOKEN_TYPE) {
            throw new Error("Invalid token type");
        }
        return {
            userId: payload.userId,
            username: payload.username,
            role: payload.role ?? "worker",
            shopId: payload.shopId ?? null,
            tokenVersion: payload.tokenVersion ?? 0,
        };
    },
    createRefreshToken() {
        return randomBytes(48).toString("hex");
    },
    hashRefreshToken(token) {
        return createHash("sha256").update(token).digest("hex");
    },
};
//# sourceMappingURL=token.service.js.map