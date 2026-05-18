import { apiClient } from "../../../core/api-client";
export async function getActiveTaskIdsApi() {
    return apiClient.get("/logistic/items/active-task-ids", {
        requiresAuth: true,
    });
}
