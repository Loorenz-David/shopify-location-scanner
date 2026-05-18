import { apiClient } from "../../../core/api-client";
export async function deletePushSubscriptionApi(dto) {
    await apiClient.delete("/logistic/push-subscription", dto, {
        requiresAuth: true,
    });
}
