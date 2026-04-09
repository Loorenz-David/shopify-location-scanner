import WebSocket from "ws";
import { logger } from "../../shared/logging/logger.js";
import { getConnections, removeConnection } from "./ws-registry.js";
export const broadcastToShop = (shopId, event) => {
    const connections = getConnections(shopId);
    const payload = JSON.stringify(event);
    for (const ws of connections) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
            continue;
        }
        removeConnection(shopId, ws);
        logger.info("WS: removed stale connection", { shopId });
    }
};
//# sourceMappingURL=ws-broadcaster.js.map