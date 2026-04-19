import { tokenAuthController } from "../../../core/api-client";
import { appEnterApi } from "../api/app-presence.api";
import { appLeaveApi } from "../api/app-presence.api";
import { getCurrentUserApi } from "../api/get-current-user.api";
import { loginApi } from "../api/login.api";
import { logoutApi } from "../api/logout.api";
import { registerApi } from "../api/register.api";
import { pwaActions } from "../../pwa/actions/pwa.actions";
import type {
  AuthUserDto,
  LoginRequestDto,
  RegisterRequestDto,
} from "../types/auth.dto";

const AUTH_USER_STORAGE_KEY = "authUser";

function setStoredAuthUser(user: AuthUserDto): void {
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
}

function clearStoredAuthUser(): void {
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

export async function loginController(
  payload: LoginRequestDto,
): Promise<AuthUserDto> {
  const session = await loginApi(payload);
  tokenAuthController.setTokens(session.tokens);
  setStoredAuthUser(session.user);
  return session.user;
}

export async function registerController(
  payload: RegisterRequestDto,
): Promise<AuthUserDto> {
  const session = await registerApi(payload);
  tokenAuthController.setTokens(session.tokens);
  setStoredAuthUser(session.user);
  return session.user;
}

export async function hydrateAuthSessionController(): Promise<AuthUserDto | null> {
  const accessToken = tokenAuthController.getAccessToken();
  if (!accessToken) {
    return null;
  }

  try {
    const response = await getCurrentUserApi();
    setStoredAuthUser(response.user);
    return response.user;
  } catch {
    tokenAuthController.clearTokens();
    clearStoredAuthUser();
    return null;
  }
}

export function clearAuthSessionController(): void {
  tokenAuthController.clearTokens();
  clearStoredAuthUser();
}

export async function logoutController(): Promise<void> {
  // Unsubscribe from push before clearing tokens (the DELETE endpoint requires auth).
  await pwaActions.unsubscribeFromPush();

  const refreshToken = tokenAuthController.getRefreshToken();
  try {
    if (refreshToken) {
      await logoutApi({ refreshToken });
    }
  } finally {
    clearAuthSessionController();
  }
}

export async function appEnterController(): Promise<void> {
  await appEnterApi();
}

export async function appLeaveController(): Promise<void> {
  await appLeaveApi();
}
