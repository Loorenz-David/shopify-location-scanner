import { apiClient } from "../../../core/api-client";
export async function listZonesApi(params) {
    const query = params?.floorPlanId
        ? `?floorPlanId=${encodeURIComponent(params.floorPlanId)}`
        : "";
    const response = await apiClient.get(`/zones${query}`, {
        requiresAuth: true,
    });
    return response.data;
}
