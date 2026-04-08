import "./config/load-env.js";
import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { asyncHandler } from "./shared/http/async-handler.js";
import { errorMiddleware } from "./shared/http/error-middleware.js";
import { notFoundMiddleware } from "./shared/http/not-found-middleware.js";
import { requestContextMiddleware } from "./shared/http/request-context-middleware.js";
import { logger } from "./shared/logging/logger.js";
import { ValidationError } from "./shared/errors/http-errors.js";
import { checkDatabaseConnection, initializeDatabaseRuntime, } from "./shared/database/sqlite-runtime.js";
import { authRouter } from "./modules/auth/routes/auth.routes.js";
import { shopifyRouter } from "./modules/shopify/routes/shopify.routes.js";
import { bootstrapRouter } from "./modules/bootstrap/routes/bootstrap.routes.js";
import { scannerRouter } from "./modules/scanner/routes/scanner.routes.js";
const app = express();
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
app.use(express.json());
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
app.use("/auth", authRouter);
app.use("/shopify", shopifyRouter);
app.use("/bootstrap", bootstrapRouter);
app.use("/scanner", scannerRouter);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
const PORT = Number(env.PORT || 4000);
await initializeDatabaseRuntime();
const server = app.listen(PORT, () => {
    logger.info("Backend started", { port: PORT, env: env.NODE_ENV });
});
const shutdown = (signal) => {
    logger.warn("Shutdown signal received", { signal });
    server.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
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