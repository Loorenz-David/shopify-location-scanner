import { apiClient } from "../../../core/api-client";
export async function getCurrentUserApi() {
    return apiClient.get("/auth/me", {
        requiresAuth: true,
    });
}
