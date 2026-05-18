import { apiClient } from "../../../core/api-client";
export async function refreshTokenApi(payload) {
    return apiClient.post("/auth/refresh", payload, { requiresAuth: false });
}
