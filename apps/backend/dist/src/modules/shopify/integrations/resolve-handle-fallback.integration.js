import { logger } from "../../../shared/logging/logger.js";
const handleFallbackCache = new Map();
const inFlightHandleFallbacks = new Map();
const HANDLE_PATH_REGEX = /\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?products\/([^/?#]+)/i;
const normalizeShopDomain = (shopDomain) => {
    const trimmed = shopDomain.trim().toLowerCase();
    if (!trimmed) {
        return null;
    }
    const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
    const hostOnly = withoutProtocol.split("/")[0]?.trim() ?? "";
    if (!hostOnly) {
        return null;
    }
    if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(hostOnly)) {
        return null;
    }
    return hostOnly;
};
export const resolveHandleFallback = async (input) => {
    const normalizedHandle = input.handle.trim();
    if (!normalizedHandle) {
        return null;
    }
    const normalizedDomain = normalizeShopDomain(input.shopDomain);
    if (!normalizedDomain) {
        return null;
    }
    const cacheKey = `${normalizedDomain}:${normalizedHandle.toLowerCase()}`;
    if (handleFallbackCache.has(cacheKey)) {
        return handleFallbackCache.get(cacheKey) ?? null;
    }
    const existingRequest = inFlightHandleFallbacks.get(cacheKey);
    if (existingRequest) {
        return existingRequest;
    }
    const request = (async () => {
        try {
            const url = new URL(`/products/${encodeURIComponent(normalizedHandle)}`, `https://${normalizedDomain}`);
            const response = await fetch(url, {
                method: "HEAD",
                redirect: "follow",
            });
            const finalPathname = new URL(response.url).pathname;
            const match = finalPathname.match(HANDLE_PATH_REGEX);
            const resolvedHandle = match?.[1]?.trim() ?? "";
            if (!resolvedHandle || resolvedHandle === normalizedHandle) {
                handleFallbackCache.set(cacheKey, null);
                return null;
            }
            handleFallbackCache.set(cacheKey, resolvedHandle);
            return resolvedHandle;
        }
        catch (error) {
            logger.warn("Shopify handle fallback resolution failed", {
                handle: normalizedHandle,
                shopDomain: normalizedDomain,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
        finally {
            inFlightHandleFallbacks.delete(cacheKey);
        }
    })();
    inFlightHandleFallbacks.set(cacheKey, request);
    return request;
};
//# sourceMappingURL=resolve-handle-fallback.integration.js.map