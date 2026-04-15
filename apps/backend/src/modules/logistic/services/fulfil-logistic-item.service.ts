import { prisma } from "../../../shared/database/prisma-client.js";
import { logger } from "../../../shared/logging/logger.js";
import { broadcastToShop } from "../../ws/ws-broadcaster.js";
import { logisticEventRepository } from "../repositories/logistic-event.repository.js";
import { NotFoundError } from "../../../shared/errors/http-errors.js";

export const fulfilLogisticItemService = async (input: {
  scanHistoryId: string;
  shopId: string;
  username: string;
}): Promise<void> => {
  logger.info("Fulfil logistic item started", input);

  const scanHistory = await prisma.scanHistory.findFirst({
    where: {
      id: input.scanHistoryId,
      shopId: input.shopId,
      isSold: true,
      logisticsCompletedAt: null,
    },
    select: { id: true, orderId: true, logisticLocationId: true },
  });

  if (!scanHistory) {
    // Covers: wrong shop, not sold, already fulfilled this cycle
    throw new NotFoundError("Active logistics item not found");
  }

  await logisticEventRepository.appendEvent({
    scanHistoryId: input.scanHistoryId,
    shopId: input.shopId,
    orderId: scanHistory.orderId ?? null,
    logisticLocationId: scanHistory.logisticLocationId ?? null,
    username: input.username,
    eventType: "fulfilled",
    completedAt: new Date(),
  });

  broadcastToShop(
    input.shopId,
    {
      type: "logistic_item_fulfilled",
      scanHistoryId: input.scanHistoryId,
      orderId: scanHistory.orderId ?? null,
    },
    ["seller", "admin"],
  );

  logger.info("Fulfil logistic item completed", input);
};
