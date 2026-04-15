import "./config/load-env.js";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { asyncHandler } from "./shared/http/async-handler.js";
import { errorMiddleware } from "./shared/http/error-middleware.js";
import { notFoundMiddleware } from "./shared/http/not-found-middleware.js";
import { authRateLimitMiddleware, globalRateLimitMiddleware, } from "./shared/http/rate-limit-middleware.js";
import { requestFilterMiddleware } from "./shared/http/request-filter-middleware.js";
import { requestContextMiddleware } from "./shared/http/request-context-middleware.js";
import { logger } from "./shared/logging/logger.js";
import { ValidationError } from "./shared/errors/http-errors.js";
import { checkDatabaseConnection, initializeDatabaseRuntime, } from "./shared/database/sqlite-runtime.js";
import { authRouter } from "./modules/auth/routes/auth.routes.js";
import { shopifyRouter } from "./modules/shopify/routes/shopify.routes.js";
import { webhookAdminRouter } from "./modules/shopify/routes/webhook-admin.routes.js";
import { bootstrapRouter } from "./modules/bootstrap/routes/bootstrap.routes.js";
import { scannerRouter } from "./modules/scanner/routes/scanner.routes.js";
import { statsRouter } from "./modules/stats/routes/stats.routes.js";
import { closeWsServer, createWsServer } from "./modules/ws/ws-server.js";
import { broadcastToShop } from "./modules/ws/ws-broadcaster.js";
import { createWsBroadcastSubscriber } from "./shared/queue/ws-bridge.js";
import { zonesRouter } from "./modules/zones/routes/zones.routes.js";
import { logisticRouter } from "./modules/logistic/routes/logistic.routes.js";
import { usersRouter } from "./modules/users/routes/users.routes.js";
const app = express();
app.set("trust proxy", 1);
const isShopifyEmbeddedLaunch = (req) => {
    const shop = req.query.shop;
    const host = req.query.host;
    const embedded = req.query.embedded;
    const idToken = req.query.id_token;
    const hasShop = typeof shop === "string" && shop.length > 0;
    const hasHost = typeof host === "string" && host.length > 0;
    const isEmbedded = embedded === "1";
    const hasIdToken = typeof idToken === "string" && idToken.length > 0;
    return hasShop && hasHost && (isEmbedded || hasIdToken);
};
const corsAllowedOrigins = Array.from(new Set([
    env.FRONTEND_URL,
    ...(env.FRONTEND_URLS?.split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0) ?? []),
]));
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            callback(null, true);
            return;
        }
        if (corsAllowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error("CORS origin is not allowed"));
    },
    credentials: true,
}));
app.use(requestContextMiddleware);
app.use(requestFilterMiddleware);
app.use(globalRateLimitMiddleware);
app.use(["/shopify/webhooks", "/api/shopify/webhooks"], express.raw({ type: "application/json" }));
app.use(express.json());
app.get("/", (req, res, next) => {
    if (!isShopifyEmbeddedLaunch(req)) {
        next();
        return;
    }
    const redirectUrl = new URL(env.FRONTEND_URL);
    if (req.originalUrl.includes("?")) {
        redirectUrl.search = req.originalUrl.slice(req.originalUrl.indexOf("?"));
    }
    res.redirect(302, redirectUrl.toString());
});
app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "backend" });
});
app.get("/health/db", asyncHandler(async (_req, res) => {
    await checkDatabaseConnection();
    res.json({ ok: true, database: "connected" });
}));
app.get("/health/error-demo", asyncHandler(async () => {
    throw new ValidationError("Demo validation error");
}));
app.use("/auth", authRateLimitMiddleware, authRouter);
app.use("/shopify", shopifyRouter);
app.use("/bootstrap", bootstrapRouter);
app.use("/scanner", scannerRouter);
app.use("/stats", statsRouter);
app.use("/zones", zonesRouter);
app.use("/logistic", logisticRouter);
app.use("/users", usersRouter);
app.use("/internal/webhooks", webhookAdminRouter);
app.use("/api/auth", authRateLimitMiddleware, authRouter);
app.use("/api/shopify", shopifyRouter);
app.use("/api/bootstrap", bootstrapRouter);
app.use("/api/scanner", scannerRouter);
app.use("/api/stats", statsRouter);
app.use("/api/zones", zonesRouter);
app.use("/api/logistic", logisticRouter);
app.use("/api/users", usersRouter);
app.use("/api/internal/webhooks", webhookAdminRouter);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
const PORT = Number(env.PORT || 4000);
await initializeDatabaseRuntime();
const httpServer = createServer(app);
createWsServer(httpServer);
// Subscribe to broadcast events published by the webhook worker process.
// The worker cannot call broadcastToShop directly (different process, empty
// in-memory WS registry), so it publishes over Redis and we forward here.
const wsBroadcastSubscriber = createWsBroadcastSubscriber((shopId, event, targetRoles) => {
    broadcastToShop(shopId, event, targetRoles);
});
httpServer.listen(PORT, () => {
    logger.info("Backend started", { port: PORT, env: env.NODE_ENV });
});
const shutdown = (signal) => {
    logger.warn("Shutdown signal received", { signal });
    void wsBroadcastSubscriber.quit();
    void closeWsServer()
        .catch((error) => {
        logger.error("Failed to close WS server", {
            error: error instanceof Error ? error.message : "unknown",
        });
    })
        .finally(() => {
        httpServer.close(() => {
            logger.info("HTTP server closed");
            process.exit(0);
        });
    });
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason });
});
process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});
//# sourceMappingURL=server.js.map