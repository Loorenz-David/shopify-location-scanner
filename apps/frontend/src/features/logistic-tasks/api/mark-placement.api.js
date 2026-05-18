import { apiClient } from "../../../core/api-client";
export async function markPlacementApi(dto) {
    await apiClient.post("/logistic/placements", dto, { requiresAuth: true });
}
