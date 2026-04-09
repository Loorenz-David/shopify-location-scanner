import type WebSocket from "ws";

const registry = new Map<string, Set<WebSocket>>();

export const registerConnection = (shopId: string, ws: WebSocket): void => {
  const existing = registry.get(shopId);
  if (existing) {
    existing.add(ws);
    return;
  }

  registry.set(shopId, new Set([ws]));
};

export const removeConnection = (shopId: string, ws: WebSocket): void => {
  const existing = registry.get(shopId);
  if (!existing) {
    return;
  }

  existing.delete(ws);
  if (existing.size === 0) {
    registry.delete(shopId);
  }
};

export const getConnections = (shopId: string): Set<WebSocket> => {
  return registry.get(shopId) ?? new Set<WebSocket>();
};
