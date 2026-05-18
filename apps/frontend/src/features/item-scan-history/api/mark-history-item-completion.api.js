import { apiClient } from "../../../core/api-client";
export async function markHistoryItemCompletedApi(input) {
    await apiClient.post("/logistic/items/mark-as-completed", input, { requiresAuth: true });
}
export async function markHistoryItemUncompletedApi(input) {
    await apiClient.post("/logistic/items/mark-as-uncompleted", input, { requiresAuth: true });
}
