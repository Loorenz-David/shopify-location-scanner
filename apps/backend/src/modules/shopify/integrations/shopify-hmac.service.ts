import { createHmac } from "node:crypto";
import { env } from "../../../config/env.js";

export const verifyShopifyCallbackHmac = (
  params: Record<string, string>,
): boolean => {
  const { hmac, ...rest } = params;

  const sorted = Object.entries(rest)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const digest = createHmac("sha256", env.SHOPIFY_API_SECRET)
    .update(sorted)
    .digest("hex");

  return digest === hmac;
};
