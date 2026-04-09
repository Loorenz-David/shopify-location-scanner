import WebSocket from "ws";
import { logger } from "../../shared/logging/logger.js";
import { getConnections, removeConnection } from "./ws-registry.js";

export type WsOutboundEvent =
  | { type: "authenticated"; shopId: string }
  | { type: "scan_history_updated"; productId: string };

export const broadcastToShop = (
  shopId: string,
  event: WsOutboundEvent,
): void => {
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
