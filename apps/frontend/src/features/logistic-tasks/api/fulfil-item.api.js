import { apiClient } from "../../../core/api-client";
export async function fulfilItemApi(dto) {
    await apiClient.post("/logistic/fulfil", dto, {
        requiresAuth: true,
    });
}
