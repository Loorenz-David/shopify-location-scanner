const registry = new Map();
export const registerConnection = (shopId, ws) => {
    const existing = registry.get(shopId);
    if (existing) {
        existing.add(ws);
        return;
    }
    registry.set(shopId, new Set([ws]));
};
export const removeConnection = (shopId, ws) => {
    const existing = registry.get(shopId);
    if (!existing) {
        return;
    }
    existing.delete(ws);
    if (existing.size === 0) {
        registry.delete(shopId);
    }
};
export const getConnections = (shopId) => {
    return registry.get(shopId) ?? new Set();
};
//# sourceMappingURL=ws-registry.js.map