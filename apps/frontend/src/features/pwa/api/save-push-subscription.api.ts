import { apiClient } from "../../../core/api-client";
import type { SavePushSubscriptionRequestDto } from "../types/push-notification.types";

export async function savePushSubscriptionApi(
  dto: SavePushSubscriptionRequestDto,
): Promise<void> {
  await apiClient.post("/logistic/push-subscription", dto, {
    requiresAuth: true,
  });
}
