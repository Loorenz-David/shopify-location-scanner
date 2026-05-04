import { prisma } from "../../../shared/database/prisma-client.js";
import { logger } from "../../../shared/logging/logger.js";
import {
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/http-errors.js";
import { broadcastToShop } from "../../ws/ws-broadcaster.js";

export const markAsUncompleted = async (input: {
  scanHistoryId: string;
  shopId: string;
  username: string;
}): Promise<void> => {
  logger.info("Mark as uncompleted started", input);

  const result = await prisma.$transaction(async (tx) => {
    const scanHistory = await tx.scanHistory.findFirst({
      where: {
        id: input.scanHistoryId,
        shopId: input.shopId,
        logisticsCompletedAt: { not: null },
      },
      select: { id: true, orderId: true },
    });

    if (!scanHistory) {
      throw new NotFoundError("Completed logistics item not found");
    }

    const latestEvent = await tx.scanHistoryLogistic.findFirst({
      where: {
        scanHistoryId: scanHistory.id,
        shopId: input.shopId,
      },
      orderBy: [{ happenedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        eventType: true,
      },
    });

    if (!latestEvent || latestEvent.eventType !== "fulfilled") {
      throw new ValidationError(
        "Cannot uncomplete item because latest logistic event is not fulfilled",
      );
    }

    await tx.scanHistoryLogistic.delete({
      where: { id: latestEvent.id },
    });

    const previousEvent = await tx.scanHistoryLogistic.findFirst({
      where: {
        scanHistoryId: scanHistory.id,
        shopId: input.shopId,
      },
      orderBy: [{ happenedAt: "desc" }, { createdAt: "desc" }],
      select: {
        eventType: true,
        logisticLocationId: true,
      },
    });

    await tx.scanHistory.update({
      where: { id: scanHistory.id },
      data: {
        logisticsCompletedAt: null,
        lastLogisticEventType: previousEvent?.eventType ?? null,
        logisticLocationId: previousEvent?.logisticLocationId ?? null,
      },
    });

    return { orderId: scanHistory.orderId ?? null };
  });

  broadcastToShop(input.shopId, {
    type: "logistic_items_updated",
    itemIds: [input.scanHistoryId],
    orderId: result.orderId,
  });

  logger.info("Mark as uncompleted finished", input);
};
