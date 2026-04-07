import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "../../../config/env.js";

type ShopifyOAuthStatePayload = {
  nonce: string;
  userId: string;
  issuedAt: number;
};

export const shopifyOauthStateService = {
  sign(userId: string): string {
    const payload: ShopifyOAuthStatePayload = {
      nonce: randomUUID(),
      userId,
      issuedAt: Date.now(),
    };

    return jwt.sign(payload, env.JWT_SECRET);
  },

  verify(state: string): ShopifyOAuthStatePayload {
    return jwt.verify(state, env.JWT_SECRET) as ShopifyOAuthStatePayload;
  },
};
