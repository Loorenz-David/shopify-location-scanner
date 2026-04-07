import { apiClient } from "../../../core/api-client";
import type { AuthSessionDto, RegisterRequestDto } from "../types/auth.dto";

export async function registerApi(
  payload: RegisterRequestDto,
): Promise<AuthSessionDto> {
  return apiClient.post<AuthSessionDto, RegisterRequestDto>(
    "/auth/register",
    payload,
    { requiresAuth: false },
  );
}
