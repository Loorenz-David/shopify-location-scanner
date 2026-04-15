import WebSocket from "ws";
import type { UserRole } from "@prisma/client";
import { logger } from "../../shared/logging/logger.js";
import { getConnections, getConnectionsForUser, removeConnection } from "./ws-registry.js";

export type WsOutboundEvent =
  | { type: "authenticated"; shopId: string }
  | { type: "scan_history_updated"; productId: string }
  | {
      type: "logistic_intention_set";
      scanHistoryId: string;
      orderId: string | null;
      intention: string;
    }
  | {
      type: "logistic_item_placed";
      scanHistoryId: string;
      orderId: string | null;
      logisticLocationId: string;
    }
  | {
      type: "logistic_item_fulfilled";
      scanHistoryId: string;
      orderId: string | null;
    }
  | {
      type: "logistic_batch_notification";
      count: number;
      itemIds: string[];
      message: string;
    }
  | { type: "session_invalidated" };

export const broadcastToUser = (
  shopId: string,
  userId: string,
  event: WsOutboundEvent,
): void => {
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

export const broadcastToShop = (
  shopId: string,
  event: WsOutboundEvent,
  targetRoles?: UserRole[],
): void => {
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
