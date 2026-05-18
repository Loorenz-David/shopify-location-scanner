import { apiClient } from "../../../core/api-client";
export async function logoutApi(payload) {
    return apiClient.post("/auth/logout", payload, { requiresAuth: true });
}
