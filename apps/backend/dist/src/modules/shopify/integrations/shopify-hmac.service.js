import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../../config/env.js";
export const verifyShopifyCallbackHmac = (params) => {
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
export const verifyShopifyWebhookHmac = (input) => {
    const digestBase64 = createHmac("sha256", env.SHOPIFY_API_SECRET)
        .update(input.rawBody, "utf8")
        .digest("base64");
    const expected = Buffer.from(digestBase64, "utf8");
    const provided = Buffer.from(input.hmacBase64, "utf8");
    if (expected.length !== provided.length) {
        return false;
    }
    return timingSafeEqual(expected, provided);
};
//# sourceMappingURL=shopify-hmac.service.js.map