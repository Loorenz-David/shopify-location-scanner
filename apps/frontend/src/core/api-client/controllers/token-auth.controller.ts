import { getAccessTokenClaims, isTokenExpired } from "../domain/jwt.domain";
import type {
  AccessTokenClaims,
  HttpMethod,
  TokenPair,
} from "../types/api-client.types";

interface TokenAuthControllerConfig {
  accessTokenStorageKey?: string;
  refreshTokenStorageKey?: string;
  refreshEndpoint?: string;
  refreshMethod?: HttpMethod;
}

interface RefreshResponse {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
}

export class AuthSessionExpiredError extends Error {
  constructor(message = "Authentication session expired") {
    super(message);
    this.name = "AuthSessionExpiredError";
  }
}

export class TokenAuthController {
  private readonly accessTokenStorageKey: string;
  private readonly refreshTokenStorageKey: string;
  private readonly refreshEndpoint: string;
  private readonly refreshMethod: HttpMethod;
  private refreshInFlight: Promise<string> | null;
  private readonly sessionExpiredListeners: Set<() => void>;
  private hasNotifiedSessionExpired: boolean;

  constructor(config: TokenAuthControllerConfig = {}) {
    this.accessTokenStorageKey = config.accessTokenStorageKey ?? "accessToken";
    this.refreshTokenStorageKey =
      config.refreshTokenStorageKey ?? "refreshToken";
    this.refreshEndpoint = config.refreshEndpoint ?? "/auth/refresh";
    this.refreshMethod = config.refreshMethod ?? "POST";
    this.refreshInFlight = null;
    this.sessionExpiredListeners = new Set();
    this.hasNotifiedSessionExpired = false;
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenStorageKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenStorageKey);
  }

  getAccessTokenClaims(): AccessTokenClaims | null {
    return getAccessTokenClaims(this.getAccessToken());
  }

  setTokens(tokens: TokenPair): void {
    localStorage.setItem(this.accessTokenStorageKey, tokens.accessToken);
    this.hasNotifiedSessionExpired = false;

    if (tokens.refreshToken) {
      localStorage.setItem(this.refreshTokenStorageKey, tokens.refreshToken);
    }
  }

  clearTokens(): void {
    localStorage.removeItem(this.accessTokenStorageKey);
    localStorage.removeItem(this.refreshTokenStorageKey);
  }

  onSessionExpired(listener: () => void): () => void {
    this.sessionExpiredListeners.add(listener);

    return () => {
      this.sessionExpiredListeners.delete(listener);
    };
  }

  shouldRefreshAccessToken(): boolean {
    return isTokenExpired(this.getAccessToken());
  }

  async refreshAccessToken(baseUrl: string): Promise<string> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = this.executeRefresh(baseUrl);

    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  private async executeRefresh(baseUrl: string): Promise<string> {
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

    const data = (await refreshResponse.json()) as RefreshResponse;
    const accessToken = data.accessToken ?? data.token;

    if (!accessToken) {
      this.expireSession();
      throw new AuthSessionExpiredError(
        "Refresh response is missing access token",
      );
    }

    this.setTokens({
      accessToken,
      refreshToken: data.refreshToken ?? refreshToken,
    });

    return accessToken;
  }

  private buildRefreshUrl(baseUrl: string): string {
    const cleanBaseUrl = baseUrl.replace(/\/$/, "");
    const cleanRefreshPath = this.refreshEndpoint.startsWith("/")
      ? this.refreshEndpoint
      : `/${this.refreshEndpoint}`;

    return `${cleanBaseUrl}${cleanRefreshPath}`;
  }

  private expireSession(): void {
    this.clearTokens();

    if (this.hasNotifiedSessionExpired) {
      return;
    }

    this.hasNotifiedSessionExpired = true;
    this.sessionExpiredListeners.forEach((listener) => listener());
  }
}
