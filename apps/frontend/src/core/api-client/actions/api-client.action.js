import { AuthSessionExpiredError, TokenAuthController, } from "../controllers/token-auth.controller";
export class ApiClientError extends Error {
    status;
    endpoint;
    method;
    data;
    constructor(message, details) {
        super(message);
        this.name = "ApiClientError";
        this.status = details.status;
        this.endpoint = details.endpoint;
        this.method = details.method;
        this.data = details.data;
    }
}
export function createApiClient(config = {}) {
    const baseUrl = config.baseUrl ?? "";
    const defaultHeaders = config.defaultHeaders ?? {};
    const tokenAuthController = config.tokenAuthController ?? new TokenAuthController();
    async function request(method, endpoint, payloadOrOptions, maybeOptions) {
        const payload = method === "GET" ? undefined : payloadOrOptions;
        const options = method === "GET"
            ? payloadOrOptions
            : maybeOptions;
        return executeRequest({
            method,
            endpoint,
            payload,
            options,
            baseUrl,
            defaultHeaders,
            tokenAuthController,
            isRetry: false,
        });
    }
    return {
        request,
        get: (endpoint, options) => request("GET", endpoint, options),
        post: (endpoint, payload, options) => request("POST", endpoint, payload, options),
        put: (endpoint, payload, options) => request("PUT", endpoint, payload, options),
        patch: (endpoint, payload, options) => request("PATCH", endpoint, payload, options),
        delete: (endpoint, payload, options) => request("DELETE", endpoint, payload, options),
    };
}
async function executeRequest(config) {
    const { method, endpoint, payload, options, baseUrl, defaultHeaders, tokenAuthController, isRetry, } = config;
    const requiresAuth = options?.requiresAuth ?? true;
    const url = buildRequestUrl(baseUrl, endpoint);
    const headers = new Headers(defaultHeaders);
    if (options?.headers) {
        new Headers(options.headers).forEach((value, key) => headers.set(key, value));
    }
    const body = buildRequestBody(method, payload, headers);
    if (requiresAuth) {
        if (tokenAuthController.shouldRefreshAccessToken()) {
            await tokenAuthController.refreshAccessToken(baseUrl);
        }
        const accessToken = tokenAuthController.getAccessToken();
        if (accessToken) {
            headers.set("Authorization", `Bearer ${accessToken}`);
        }
    }
    const response = await fetch(url, {
        method,
        headers,
        body,
    });
    if (response.status === 401 && requiresAuth && !isRetry) {
        try {
            await tokenAuthController.refreshAccessToken(baseUrl);
            return executeRequest({
                ...config,
                isRetry: true,
            });
        }
        catch (error) {
            if (error instanceof AuthSessionExpiredError) {
                tokenAuthController.clearTokens();
            }
            throw error;
        }
    }
    const responseData = await parseResponseBody(response);
    if (!response.ok) {
        throw new ApiClientError("API request failed", {
            status: response.status,
            endpoint,
            method,
            data: responseData,
        });
    }
    return responseData;
}
function buildRequestUrl(baseUrl, endpoint) {
    const cleanBaseUrl = baseUrl.replace(/\/$/, "");
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = new URL(`${cleanBaseUrl}${cleanEndpoint}`, window.location.origin);
    if (!cleanBaseUrl) {
        return `${cleanEndpoint}${url.search}`;
    }
    return url.toString();
}
function buildRequestBody(method, payload, headers) {
    if (method === "GET" || payload === undefined) {
        return undefined;
    }
    if (payload instanceof FormData || payload instanceof URLSearchParams) {
        return payload;
    }
    headers.set("Content-Type", "application/json");
    return JSON.stringify(payload);
}
async function parseResponseBody(response) {
    if (response.status === 204) {
        return undefined;
    }
    const contentType = response.headers.get("Content-Type") ?? "";
    if (contentType.includes("application/json")) {
        return response.json();
    }
    return response.text();
}
