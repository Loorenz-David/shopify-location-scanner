import { getAccessTokenClaims, isTokenExpired } from "../domain/jwt.domain";
export class AuthSessionExpiredError extends Error {
    constructor(message = "Authentication session expired") {
        super(message);
        this.name = "AuthSessionExpiredError";
    }
}
export class TokenAuthController {
    accessTokenStorageKey;
    refreshTokenStorageKey;
    refreshEndpoint;
    refreshMethod;
    refreshInFlight;
    sessionExpiredListeners;
    hasNotifiedSessionExpired;
    constructor(config = {}) {
        this.accessTokenStorageKey = config.accessTokenStorageKey ?? "accessToken";
        this.refreshTokenStorageKey =
            config.refreshTokenStorageKey ?? "refreshToken";
        this.refreshEndpoint = config.refreshEndpoint ?? "/auth/refresh";
        this.refreshMethod = config.refreshMethod ?? "POST";
        this.refreshInFlight = null;
        this.sessionExpiredListeners = new Set();
        this.hasNotifiedSessionExpired = false;
    }
    getAccessToken() {
        return localStorage.getItem(this.accessTokenStorageKey);
    }
    getRefreshToken() {
        return localStorage.getItem(this.refreshTokenStorageKey);
    }
    getAccessTokenClaims() {
        return getAccessTokenClaims(this.getAccessToken());
    }
    setTokens(tokens) {
        localStorage.setItem(this.accessTokenStorageKey, tokens.accessToken);
        this.hasNotifiedSessionExpired = false;
        if (tokens.refreshToken) {
            localStorage.setItem(this.refreshTokenStorageKey, tokens.refreshToken);
        }
    }
    clearTokens() {
        localStorage.removeItem(this.accessTokenStorageKey);
        localStorage.removeItem(this.refreshTokenStorageKey);
    }
    onSessionExpired(listener) {
        this.sessionExpiredListeners.add(listener);
        return () => {
            this.sessionExpiredListeners.delete(listener);
        };
    }
    shouldRefreshAccessToken() {
        return isTokenExpired(this.getAccessToken());
    }
    async refreshAccessToken(baseUrl) {
        if (this.refreshInFlight) {
            return this.refreshInFlight;
        }
        this.refreshInFlight = this.executeRefresh(baseUrl);
        try {
            return await this.refreshInFlight;
        }
        finally {
            this.refreshInFlight = null;
        }
    }
    async executeRefresh(baseUrl) {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            this.expireSession();
            throw new AuthSessionExpiredError("Refresh token is missing");
        }
        const refreshUrl = this.buildRefreshUrl(baseUrl);
        const refreshResponse = await fetch(refreshUrl, {
            method: this.refreshMethod,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${refreshToken}`,
            },
            body: JSON.stringify({ refreshToken }),
        });
        if (!refreshResponse.ok) {
            this.expireSession();
            throw new AuthSessionExpiredError("Refresh token is invalid");
        }
        const data = (await refreshResponse.json());
        const accessToken = data.accessToken ?? data.token;
        if (!accessToken) {
            this.expireSession();
            throw new AuthSessionExpiredError("Refresh response is missing access token");
        }
        this.setTokens({
            accessToken,
            refreshToken: data.refreshToken ?? refreshToken,
        });
        return accessToken;
    }
    buildRefreshUrl(baseUrl) {
        const cleanBaseUrl = baseUrl.replace(/\/$/, "");
        const cleanRefreshPath = this.refreshEndpoint.startsWith("/")
            ? this.refreshEndpoint
            : `/${this.refreshEndpoint}`;
        return `${cleanBaseUrl}${cleanRefreshPath}`;
    }
    expireSession() {
        this.clearTokens();
        if (this.hasNotifiedSessionExpired) {
            return;
        }
        this.hasNotifiedSessionExpired = true;
        this.sessionExpiredListeners.forEach((listener) => listener());
    }
}
