import { apiClient } from "../../../core/api-client";

export async function deleteLogisticLocationApi(id: string): Promise<void> {
  await apiClient.delete(`/logistic/delete-location/${id}`, undefined, {
    requiresAuth: true,
  });
}
