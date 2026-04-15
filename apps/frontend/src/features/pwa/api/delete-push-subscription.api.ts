import { apiClient } from "../../../core/api-client";
import type { DeletePushSubscriptionRequestDto } from "../types/push-notification.types";

export async function deletePushSubscriptionApi(
  dto: DeletePushSubscriptionRequestDto,
): Promise<void> {
  await apiClient.delete("/logistic/push-subscription", dto, {
    requiresAuth: true,
  });
}
