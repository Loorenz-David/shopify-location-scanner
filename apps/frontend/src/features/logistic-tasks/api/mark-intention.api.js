import { apiClient } from "../../../core/api-client";
export async function markIntentionApi(dto) {
    return apiClient.post("/logistic/intentions", dto, { requiresAuth: true });
}
