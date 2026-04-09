import { createHash } from "node:crypto";
import WebSocket, { WebSocketServer } from "ws";
import { env } from "../../config/env.js";
import { logger } from "../../shared/logging/logger.js";
import { waitForAuth } from "./ws-auth.js";
import { registerConnection, removeConnection } from "./ws-registry.js";
const PING_INTERVAL_MS = 30_000;
const WS_PATH = "/ws";
let wsServer = null;
const getAllowedOrigins = () => {
    return Array.from(new Set([
        env.FRONTEND_URL,
        ...(env.FRONTEND_URLS?.split(",")
            .map((origin) => origin.trim())
            .filter((origin) => origin.length > 0) ?? []),
    ]));
};
const isAllowedOrigin = (request) => {
    const origin = request.headers.origin;
    if (!origin) {
        return true;
    }
    return getAllowedOrigins().includes(origin);
};
const rejectUpgrade = (socket, statusLine) => {
    socket.write(`HTTP/1.1 ${statusLine}\r\n\r\n`);
    socket.destroy();
};
const socketId = (ws) => {
    return createHash("sha1")
        .update(String(Date.now()) + Math.random().toString())
        .digest("hex")
        .slice(0, 12);
};
const sendEvent = (ws, event) => {
    ws.send(JSON.stringify(event));
};
export const createWsServer = (httpServer) => {
    if (wsServer) {
        return wsServer;
    }
    wsServer = new WebSocketServer({ noServer: true });
    httpServer.on("upgrade", (request, socket, head) => {
        const { pathname } = new URL(request.url ?? "/", "http://localhost");
        if (pathname !== WS_PATH) {
            socket.destroy();
            return;
        }
        if (!isAllowedOrigin(request)) {
            rejectUpgrade(socket, "403 Forbidden");
            return;
        }
        wsServer?.handleUpgrade(request, socket, head, (ws) => {
            wsServer?.emit("connection", ws, request);
        });
    });
    wsServer.on("connection", async (ws, request) => {
        const connectionId = socketId(ws);
        const auth = await waitForAuth(ws);
        if (!auth.ok) {
            logger.warn("WS: authentication failed", {
                connectionId,
                origin: request.headers.origin ?? null,
            });
            return;
        }
        const { shopId, userId } = auth;
        registerConnection(shopId, ws);
        logger.info("WS: client connected", { connectionId, shopId, userId });
        sendEvent(ws, { type: "authenticated", shopId });
        let isAlive = true;
        const pingTimer = setInterval(() => {
            if (!isAlive) {
                logger.info("WS: client did not pong, terminating", {
                    connectionId,
                    shopId,
                    userId,
                });
                removeConnection(shopId, ws);
                ws.terminate();
                return;
            }
            isAlive = false;
            ws.ping();
        }, PING_INTERVAL_MS);
        ws.on("pong", () => {
            isAlive = true;
        });
        ws.on("message", () => {
            isAlive = true;
        });
        ws.on("close", () => {
            clearInterval(pingTimer);
            removeConnection(shopId, ws);
            logger.info("WS: client disconnected", { connectionId, shopId, userId });
        });
        ws.on("error", (error) => {
            clearInterval(pingTimer);
            removeConnection(shopId, ws);
            logger.error("WS: socket error", {
                connectionId,
                shopId,
                userId,
                error: error.message,
            });
        });
    });
    logger.info("WS: server attached", { path: WS_PATH });
    return wsServer;
};
export const closeWsServer = async () => {
    if (!wsServer) {
        return;
    }
    const activeServer = wsServer;
    wsServer = null;
    await new Promise((resolve, reject) => {
        activeServer.close((error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
};
//# sourceMappingURL=ws-server.js.map