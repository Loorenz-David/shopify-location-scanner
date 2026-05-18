import { apiClient } from "../../../core/api-client";
export async function createLogisticLocationApi(dto) {
    return apiClient.put("/logistic/add-location", dto, { requiresAuth: true });
}
