import type WebSocket from "ws";
import type { UserRole } from "@prisma/client";
import { Redis } from "ioredis";
import { env } from "../../config/env.js";

type WsConnection = {
  ws: WebSocket;
  role: UserRole;
  userId: string;
};

const registry = new Map<string, Set<WsConnection>>();

const presenceClient = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });

const WS_PRESENCE_TTL_SECONDS = 3600;

export const registerConnection = async (
  shopId: string,
  ws: WebSocket,
  role: UserRole,
  userId: string,
): Promise<void> => {
  const existing = registry.get(shopId);
  if (existing) {
    existing.add({ ws, role, userId });
  } else {
    registry.set(shopId, new Set([{ ws, role, userId }]));
  }

  await presenceClient.sadd(`iss:ws:online:${shopId}`, userId);
  await presenceClient.expire(
    `iss:ws:online:${shopId}`,
    WS_PRESENCE_TTL_SECONDS,
  );
};

export const removeConnection = async (
  shopId: string,
  ws: WebSocket,
): Promise<void> => {
  const existing = registry.get(shopId);
  if (!existing) {
    return;
  }

  let removedUserId: string | undefined;
  for (const conn of existing) {
    if (conn.ws === ws) {
      removedUserId = conn.userId;
      existing.delete(conn);
      break;
    }
  }

  if (existing.size === 0) {
    registry.delete(shopId);
  }

  // Remove from Redis presence if this user has no remaining connections in this shop
  if (removedUserId) {
    const stillConnected = [...(registry.get(shopId) ?? [])].some(
      (c) => c.userId === removedUserId,
    );
    if (!stillConnected) {
      await presenceClient.srem(`iss:ws:online:${shopId}`, removedUserId);
    }
  }
};

export const getConnections = (
  shopId: string,
  roles?: UserRole[],
): WebSocket[] => {
  const all = registry.get(shopId) ?? new Set<WsConnection>();
  return [...all]
    .filter((c) => !roles || roles.includes(c.role))
    .map((c) => c.ws);
};

export const isUserConnectedViaWs = async (
  shopId: string,
  userId: string,
): Promise<boolean> => {
  const isMember = await presenceClient.sismember(
    `iss:ws:online:${shopId}`,
    userId,
  );
  return isMember === 1;
};
