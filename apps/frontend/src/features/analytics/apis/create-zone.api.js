import { apiClient } from "../../../core/api-client";
export async function createZoneApi(payload) {
    const response = await apiClient.post("/zones", payload, { requiresAuth: true });
    return response.data;
}
