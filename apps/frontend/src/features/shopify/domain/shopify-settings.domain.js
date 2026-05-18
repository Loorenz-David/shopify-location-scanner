export function normalizeShopifyStoreInput(value) {
    const normalized = value.trim();
    if (!normalized) {
        return { storeName: "" };
    }
    if (normalized.endsWith(".myshopify.com")) {
        return { shopDomain: normalized };
    }
    return { storeName: normalized };
}
export function formatShopConnectedAt(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString();
}
