import { apiClient } from "../../../core/api-client";
export async function savePushSubscriptionApi(dto) {
    await apiClient.post("/logistic/push-subscription", dto, {
        requiresAuth: true,
    });
}
