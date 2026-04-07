import {
  clearAuthSessionController,
  hydrateAuthSessionController,
  loginController,
  logoutController,
  registerController,
} from "../controllers/auth.controller";
import type {
  AuthUserDto,
  LoginRequestDto,
  RegisterRequestDto,
} from "../types/auth.dto";

export const authActions = {
  async login(payload: LoginRequestDto): Promise<AuthUserDto> {
    return loginController(payload);
  },
  async register(payload: RegisterRequestDto): Promise<AuthUserDto> {
    return registerController(payload);
  },
  async hydrateSession(): Promise<AuthUserDto | null> {
    return hydrateAuthSessionController();
  },
  async logout(): Promise<void> {
    await logoutController();
  },
  clearSession(): void {
    clearAuthSessionController();
  },
};
