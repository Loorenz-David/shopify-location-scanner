import { NotFoundError } from "../../../shared/errors/http-errors.js";
import { logger } from "../../../shared/logging/logger.js";
import { scanHistoryRepository } from "../../scanner/repositories/scan-history.repository.js";
import { broadcastToShop } from "../../ws/ws-broadcaster.js";
import type { ScheduleOrderItemsInput } from "../contracts/external-api.contract.js";

export const scheduleOrderItemsCommand = async (
  input: ScheduleOrderItemsInput,
): Promise<{ updated: number }> => {
  const updatedItemIds = await scanHistoryRepository.scheduleSoldItemsByOrder({
    shopId: input.shopId,
    orderId: input.orderId,
    scheduledDate: input.scheduledDate,
  });

  if (updatedItemIds.length === 0) {
    throw new NotFoundError(
      `No sold items found for orderId "${input.orderId}" in this shop`,
    );
  }

  broadcastToShop(input.shopId, {
    type: "logistic_items_updated",
    itemIds: updatedItemIds,
    orderId: input.orderId,
  });

  logger.info("Scheduled sold items for external inbound request", {
    shopId: input.shopId,
    orderId: input.orderId,
    scheduledDate: input.scheduledDate.toISOString(),
    updated: updatedItemIds.length,
  });

  return { updated: updatedItemIds.length };
};
