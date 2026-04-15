import { Redis } from "ioredis";
import { env } from "../../config/env.js";
const registry = new Map();
const presenceClient = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });
const WS_PRESENCE_TTL_SECONDS = 3600;
export const registerConnection = async (shopId, ws, role, userId) => {
    const existing = registry.get(shopId);
    if (existing) {
        existing.add({ ws, role, userId });
    }
    else {
        registry.set(shopId, new Set([{ ws, role, userId }]));
    }
    await presenceClient.sadd(`iss:ws:online:${shopId}`, userId);
    await presenceClient.expire(`iss:ws:online:${shopId}`, WS_PRESENCE_TTL_SECONDS);
};
export const removeConnection = async (shopId, ws) => {
    const existing = registry.get(shopId);
    if (!existing) {
        return;
    }
    let removedUserId;
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
        const stillConnected = [...(registry.get(shopId) ?? [])].some((c) => c.userId === removedUserId);
        if (!stillConnected) {
            await presenceClient.srem(`iss:ws:online:${shopId}`, removedUserId);
        }
    }
};
export const getConnections = (shopId, roles) => {
    const all = registry.get(shopId) ?? new Set();
    return [...all]
        .filter((c) => !roles || roles.includes(c.role))
        .map((c) => c.ws);
};
export const getConnectionsForUser = (shopId, userId) => {
    const all = registry.get(shopId) ?? new Set();
    return [...all].filter((c) => c.userId === userId).map((c) => c.ws);
};
export const isUserConnectedViaWs = async (shopId, userId) => {
    const isMember = await presenceClient.sismember(`iss:ws:online:${shopId}`, userId);
    return isMember === 1;
};
//# sourceMappingURL=ws-registry.js.map