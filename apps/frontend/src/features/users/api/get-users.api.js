import { apiClient } from "../../../core/api-client";
export async function getUsersApi() {
    return apiClient.get("/users", {
        requiresAuth: true,
    });
}
