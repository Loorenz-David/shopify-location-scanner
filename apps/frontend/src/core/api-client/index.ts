import { createApiClient } from "./actions/api-client.action";
import { TokenAuthController } from "./controllers/token-auth.controller";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export const tokenAuthController = new TokenAuthController({
  accessTokenStorageKey: "accessToken",
  refreshTokenStorageKey: "refreshToken",
  refreshEndpoint: "/auth/refresh",
  refreshMethod: "POST",
});

export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  tokenAuthController,
});

export { ApiClientError } from "./actions/api-client.action";
export { AuthSessionExpiredError } from "./controllers/token-auth.controller";
export { decodeJwtPayload, getAccessTokenClaims } from "./domain/jwt.domain";
export type {
  AccessTokenClaims,
  ApiClient,
  HttpMethod,
  RequestOptions,
  TokenPair,
} from "./types/api-client.types";
