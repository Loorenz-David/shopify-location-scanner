import { apiClient } from "../../../core/api-client";
import type { AuthSessionDto, RefreshRequestDto } from "../types/auth.dto";

export async function refreshTokenApi(
  payload: RefreshRequestDto,
): Promise<AuthSessionDto> {
  return apiClient.post<AuthSessionDto, RefreshRequestDto>(
    "/auth/refresh",
    payload,
    { requiresAuth: false },
  );
}
