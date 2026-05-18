import { apiClient } from "../../../core/api-client";
export async function registerApi(payload) {
    return apiClient.post("/auth/register", payload, { requiresAuth: false });
}
