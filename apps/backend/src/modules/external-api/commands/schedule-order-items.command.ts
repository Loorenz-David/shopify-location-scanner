import {
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/http-errors.js";
import { logger } from "../../../shared/logging/logger.js";
import { scanHistoryRepository } from "../../scanner/repositories/scan-history.repository.js";
import { broadcastToShop } from "../../ws/ws-broadcaster.js";
import type { ScheduleOrderItemsInput } from "../contracts/external-api.contract.js";

export const scheduleOrderItemsCommand = async (
  input: ScheduleOrderItemsInput,
): Promise<{ updated: number }> => {
  const result = await scanHistoryRepository.scheduleSoldItemsByOrder({
    orderId: input.orderId,
    scheduledDate: input.scheduledDate,
  });

  if (result.matchedShopIds.length > 1) {
    throw new ConflictError(
      `Multiple shops found for orderId "${input.orderId}"; unable to resolve a single target shop`,
    );
  }

  if (result.updatedItemIds.length === 0) {
    throw new NotFoundError(
      `No sold items found for orderId "${input.orderId}"`,
    );
  }

  if (!result.resolvedShopId) {
    throw new NotFoundError(
      `No target shop could be resolved for orderId "${input.orderId}"`,
    );
  }

  broadcastToShop(result.resolvedShopId, {
    type: "logistic_items_updated",
    itemIds: result.updatedItemIds,
    orderId: input.orderId,
  });

  logger.info("Scheduled sold items for external inbound request", {
    shopId: result.resolvedShopId,
    orderId: input.orderId,
    scheduledDate:
      input.scheduledDate !== null ? input.scheduledDate.toISOString() : null,
    updated: result.updatedItemIds.length,
  });

  return { updated: result.updatedItemIds.length };
};
