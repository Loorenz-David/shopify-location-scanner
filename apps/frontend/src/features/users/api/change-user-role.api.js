import { apiClient } from "../../../core/api-client";
export async function changeUserRoleApi(payload) {
    await apiClient.post("/users/change-role", payload, {
        requiresAuth: true,
    });
}
