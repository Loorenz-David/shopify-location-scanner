import { apiClient } from "../../../core/api-client";
export async function listFloorPlansApi() {
    const response = await apiClient.get("/floor-plans", {
        requiresAuth: true,
    });
    return response.data;
}
