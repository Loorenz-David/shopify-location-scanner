import { rateLimit } from "express-rate-limit";
import { logger } from "../logging/logger.js";
const isDevelopment = process.env.NODE_ENV === "development";
const buildRateLimitHandler = (label) => {
    return (req, res) => {
        logger.warn("Rate limit exceeded", {
            requestId: req.requestId,
            limiter: label,
            method: req.method,
            path: req.originalUrl,
            ip: req.ip,
            userAgent: req.get("user-agent") ?? null,
        });
        res.status(429).json({
            ok: false,
            code: "TOO_MANY_REQUESTS",
            message: "Too many requests, please try again later.",
        });
    };
};
export const globalRateLimitMiddleware = rateLimit({
    windowMs: 60 * 1000,
    limit: 180,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isDevelopment ||
        req.path.startsWith("/health") ||
        req.path.startsWith("/shopify/webhooks"),
    handler: buildRateLimitHandler("global"),
});
export const authRateLimitMiddleware = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 25,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isDevelopment,
    handler: buildRateLimitHandler("auth"),
});
//# sourceMappingURL=rate-limit-middleware.js.map