import type { AccessTokenClaims } from "../types/api-client.types";

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded =
    padding === 0 ? normalized : normalized + "=".repeat(4 - padding);
  return atob(padded);
}

export function decodeJwtPayload<TPayload extends Record<string, unknown>>(
  token: string,
): TPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return null;
    }

    const decodedPayload = decodeBase64Url(parts[1]);
    return JSON.parse(decodedPayload) as TPayload;
  } catch {
    return null;
  }
}

export function getAccessTokenClaims(
  token: string | null,
): AccessTokenClaims | null {
  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload<AccessTokenClaims>(token);
  if (!payload) {
    return null;
  }

  return {
    userId: typeof payload.userId === "string" ? payload.userId : undefined,
    username:
      typeof payload.username === "string" ? payload.username : undefined,
    exp: typeof payload.exp === "number" ? payload.exp : undefined,
    iat: typeof payload.iat === "number" ? payload.iat : undefined,
  };
}

export function isTokenExpired(
  token: string | null,
  skewSeconds = 10,
): boolean {
  if (!token) {
    return true;
  }

  const payload = getAccessTokenClaims(token);
  if (!payload) {
    return true;
  }

  // Some backend environments issue JWTs without exp; treat them as valid
  // and rely on 401 handling instead of forcing a refresh on every request.
  if (!payload.exp) {
    return false;
  }

  const currentTimeSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= currentTimeSeconds + skewSeconds;
}
