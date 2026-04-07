import { apiClient } from "../../../core/api-client";
import type { CurrentUserResponseDto } from "../types/auth.dto";

export async function getCurrentUserApi(): Promise<CurrentUserResponseDto> {
  return apiClient.get<CurrentUserResponseDto>("/auth/me", {
    requiresAuth: true,
  });
}
