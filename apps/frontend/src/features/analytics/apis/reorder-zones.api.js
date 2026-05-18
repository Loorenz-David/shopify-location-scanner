import { apiClient } from "../../../core/api-client";
export async function reorderZonesApi(payload) {
    await apiClient.put("/zones/reorder", payload, {
        requiresAuth: true,
    });
}
