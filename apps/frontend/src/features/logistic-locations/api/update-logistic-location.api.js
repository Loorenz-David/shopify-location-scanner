import { apiClient } from "../../../core/api-client";
export async function updateLogisticLocationApi(id, dto) {
    return apiClient.patch(`/logistic/update-location/${id}`, dto, { requiresAuth: true });
}
