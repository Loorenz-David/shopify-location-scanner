import { prisma } from "../../../shared/database/prisma-client.js";
import { logger } from "../../../shared/logging/logger.js";
import { NotFoundError } from "../../../shared/errors/http-errors.js";
import { broadcastToShop } from "../../ws/ws-broadcaster.js";
import { logisticEventRepository } from "../repositories/logistic-event.repository.js";

export const markAsCompleted = async (input: {
  scanHistoryId: string;
  shopId: string;
  username: string;
}): Promise<void> => {
  logger.info("Mark as completed started", input);

  const scanHistory = await prisma.scanHistory.findFirst({
    where: {
      id: input.scanHistoryId,
      shopId: input.shopId,
      logisticsCompletedAt: null,
    },
    select: { id: true, orderId: true, logisticLocationId: true, intention: true },
  });

  if (!scanHistory) {
    throw new NotFoundError("Active logistics item not found");
  }

  const description =
    scanHistory.intention === "customer_took_it"
      ? "customer_took_it"
      : "manually set as completed";

  await logisticEventRepository.appendEvent({
    scanHistoryId: input.scanHistoryId,
    shopId: input.shopId,
    orderId: scanHistory.orderId ?? null,
    logisticLocationId: scanHistory.logisticLocationId ?? null,
    username: input.username,
    eventType: "fulfilled",
    completedAt: new Date(),
    description,
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

  logger.info("Mark as completed finished", input);
};
