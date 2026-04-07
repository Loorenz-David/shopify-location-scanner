import { apiClient } from "../../../core/api-client";
import type { LogoutRequestDto, LogoutResponseDto } from "../types/auth.dto";

export async function logoutApi(
  payload: LogoutRequestDto,
): Promise<LogoutResponseDto> {
  return apiClient.post<LogoutResponseDto, LogoutRequestDto>(
    "/auth/logout",
    payload,
    { requiresAuth: true },
  );
}
