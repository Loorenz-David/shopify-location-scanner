import { apiClient } from "../../../core/api-client";
import type { AuthSessionDto, LoginRequestDto } from "../types/auth.dto";

export async function loginApi(
  payload: LoginRequestDto,
): Promise<AuthSessionDto> {
  return apiClient.post<AuthSessionDto, LoginRequestDto>(
    "/auth/login",
    payload,
    { requiresAuth: false },
  );
}
