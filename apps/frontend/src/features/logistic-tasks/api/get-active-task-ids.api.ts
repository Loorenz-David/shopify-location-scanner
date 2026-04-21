import { apiClient } from "../../../core/api-client";

export async function getActiveTaskIdsApi(): Promise<{ ids: string[] }> {
  return apiClient.get<{ ids: string[] }>("/logistic/items/active-task-ids", {
    requiresAuth: true,
  });
}
