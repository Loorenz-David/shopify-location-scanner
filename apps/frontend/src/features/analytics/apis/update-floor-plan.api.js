import { apiClient } from "../../../core/api-client";
export async function updateFloorPlanApi(id, input) {
    const response = await apiClient.patch(`/floor-plans/${id}`, input, { requiresAuth: true });
    return response.data;
}
