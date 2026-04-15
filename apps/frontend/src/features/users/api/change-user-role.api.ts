import { apiClient } from "../../../core/api-client";
import type { ChangeUserRoleRequestDto } from "../types/users.dto";

export async function changeUserRoleApi(
  payload: ChangeUserRoleRequestDto,
): Promise<void> {
  await apiClient.post<void>("/users/change-role", payload, {
    requiresAuth: true,
  });
}
