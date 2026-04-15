import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { env } from "../../../config/env.js";
import type { AuthPrincipal } from "../domain/auth-user.js";

const ACCESS_TOKEN_TYPE = "access";

type AccessTokenPayload = AuthPrincipal & {
  type: typeof ACCESS_TOKEN_TYPE;
  tokenVersion: number;
};

export const tokenService = {
  createAccessToken(principal: AuthPrincipal): string {
    const payload: AccessTokenPayload = {
      userId: principal.userId,
      username: principal.username,
      role: principal.role,
      shopId: principal.shopId,
      tokenVersion: principal.tokenVersion,
      type: ACCESS_TOKEN_TYPE,
    };

    return jwt.sign(payload, env.JWT_SECRET);
  },

  verifyAccessToken(token: string): AuthPrincipal {
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;

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

  createRefreshToken(): string {
    return randomBytes(48).toString("hex");
  },

  hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  },
};
