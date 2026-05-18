import { apiClient } from "../../../core/api-client";
// No caller in Phase 1 — available for future single-plan detail screens.
export async function getFloorPlanApi(id) {
    const response = await apiClient.get(`/floor-plans/${id}`, { requiresAuth: true });
    return response.data;
}
