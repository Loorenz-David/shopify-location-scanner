import WebSocket from "ws";
import { logger } from "../../shared/logging/logger.js";
import { getConnections, getConnectionsForUser, removeConnection } from "./ws-registry.js";
export const broadcastToUser = (shopId, userId, event) => {
    const connections = getConnectionsForUser(shopId, userId);
    const payload = JSON.stringify(event);
    for (const ws of connections) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
            continue;
        }
        void removeConnection(shopId, ws);
        logger.info("WS: removed stale connection", { shopId });
    }
};
export const broadcastToShop = (shopId, event, targetRoles) => {
    const connections = getConnections(shopId, targetRoles);
    const payload = JSON.stringify(event);
    for (const ws of connections) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
            continue;
        }
        void removeConnection(shopId, ws);
        logger.info("WS: removed stale connection", { shopId });
    }
};
//# sourceMappingURL=ws-broadcaster.js.map