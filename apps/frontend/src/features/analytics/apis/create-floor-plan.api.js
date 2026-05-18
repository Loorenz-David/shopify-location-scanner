import { apiClient } from "../../../core/api-client";
export async function createFloorPlanApi(input) {
    const response = await apiClient.post("/floor-plans", input, {
        requiresAuth: true,
    });
    return response.data;
}
