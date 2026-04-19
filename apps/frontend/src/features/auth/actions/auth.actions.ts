import {
  connectWsClient,
  disconnectWsClient,
  tokenAuthController,
} from "../../../core/api-client";
import {
  clearAuthSessionController,
  hydrateAuthSessionController,
  loginController,
  logoutController,
  registerController,
  appEnterController,
  appLeaveController,
} from "../controllers/auth.controller";
import type {
  AuthUserDto,
  LoginRequestDto,
  RegisterRequestDto,
} from "../types/auth.dto";

export const authActions = {
  async login(payload: LoginRequestDto): Promise<AuthUserDto> {
    const user = await loginController(payload);
    connectWsClient(() => tokenAuthController.getAccessToken());
    return user;
  },
  async register(payload: RegisterRequestDto): Promise<AuthUserDto> {
    const user = await registerController(payload);
    connectWsClient(() => tokenAuthController.getAccessToken());
    return user;
  },
  async hydrateSession(): Promise<AuthUserDto | null> {
    const user = await hydrateAuthSessionController();

    if (user) {
      connectWsClient(() => tokenAuthController.getAccessToken());
    } else {
      disconnectWsClient();
    }

    return user;
  },
  async logout(): Promise<void> {
    await logoutController();
    disconnectWsClient();
  },
  clearSession(): void {
    clearAuthSessionController();
    disconnectWsClient();
  },
  async appEnter(): Promise<void> {
    await appEnterController();
  },
  async appLeave(): Promise<void> {
    await appLeaveController();
  },
};
