import { rateLimit } from "express-rate-limit";
import type { Request, Response } from "express";
import { logger } from "../logging/logger.js";

const buildRateLimitHandler = (label: string) => {
  return (req: Request, res: Response) => {
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
  skip: (req) =>
    req.path.startsWith("/health") || req.path.startsWith("/shopify/webhooks"),
  handler: buildRateLimitHandler("global"),
});

export const authRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildRateLimitHandler("auth"),
});
