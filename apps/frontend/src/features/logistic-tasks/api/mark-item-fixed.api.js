import { apiClient } from "../../../core/api-client";
export async function markItemFixedApi(input) {
    await apiClient.post("/logistic/item-is-fix", { scanHistoryId: input.scanHistoryId }, { requiresAuth: true });
}
