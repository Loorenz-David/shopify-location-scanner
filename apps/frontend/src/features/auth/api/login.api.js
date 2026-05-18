import { apiClient } from "../../../core/api-client";
export async function loginApi(payload) {
    return apiClient.post("/auth/login", payload, { requiresAuth: false });
}
