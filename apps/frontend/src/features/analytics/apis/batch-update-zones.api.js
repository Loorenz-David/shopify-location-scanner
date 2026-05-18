import { apiClient } from "../../../core/api-client";
export async function batchUpdateZonesApi(payload) {
    await apiClient.put("/zones/batch", payload, {
        requiresAuth: true,
    });
}
