import { apiClient } from "../../../core/api-client";
import type { GetUsersResponseDto } from "../types/users.dto";

export async function getUsersApi(): Promise<GetUsersResponseDto> {
  return apiClient.get<GetUsersResponseDto>("/users", {
    requiresAuth: true,
  });
}
