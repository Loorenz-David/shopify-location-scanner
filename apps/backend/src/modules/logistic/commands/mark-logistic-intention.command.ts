import {
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/http-errors.js";
import { prisma } from "../../../shared/database/prisma-client.js";
import { logger } from "../../../shared/logging/logger.js";
import { broadcastToShop } from "../../ws/ws-broadcaster.js";
import { fulfilLogisticItemService } from "../services/fulfil-logistic-item.service.js";
import { scheduleRoleNotification } from "../services/logistic-notification.service.js";
import type { MarkIntentionInput } from "../contracts/logistic.contract.js";

export const markLogisticIntentionCommand = async (input: {
  shopId: string;
  username: string;
  payload: MarkIntentionInput;
}): Promise<{ scheduledDate: Date | null }> => {
  logger.info("Mark logistic intention started", {
    shopId: input.shopId,
    scanHistoryId: input.payload.scanHistoryId,
    intention: input.payload.intention,
  });

  const scanHistory = await prisma.scanHistory.findFirst({
    where: {
      id: input.payload.scanHistoryId,
      shopId: input.shopId,
      isSold: true,
    },
    select: { id: true, orderId: true, logisticsCompletedAt: true },
  });

  if (!scanHistory) {
    throw new NotFoundError("Sold item not found for this shop");
  }

  if (scanHistory.logisticsCompletedAt) {
    throw new ValidationError("Item logistics are already completed");
  }

  await prisma.$transaction(async (tx) => {
    await tx.scanHistory.update({
      where: { id: scanHistory.id },
      data: {
        intention: input.payload.intention as any,
        fixItem: input.payload.fixItem,
        scheduledDate: input.payload.scheduledDate ?? null,
      },
    });

    await tx.scanHistoryLogistic.create({
      data: {
        scanHistoryId: scanHistory.id,
        shopId: input.shopId,
        orderId: scanHistory.orderId ?? null,
        logisticLocationId: null,
        username: input.username,
        eventType: "marked_intention" as any,
      },
    });

    await tx.scanHistory.update({
      where: { id: scanHistory.id },
      data: {
        lastLogisticEventType: "marked_intention" as any,
        logisticLocationId: null,
      },
    });
  });

  if (input.payload.intention === "customer_took_it") {
    await fulfilLogisticItemService({
      scanHistoryId: scanHistory.id,
      shopId: input.shopId,
      username: input.username,
    });

    logger.info(
      "Mark logistic intention fulfilled immediately (customer_took_it)",
      {
        shopId: input.shopId,
        scanHistoryId: scanHistory.id,
      },
    );

    return { scheduledDate: input.payload.scheduledDate ?? null };
  }

  broadcastToShop(
    input.shopId,
    {
      type: "logistic_intention_set",
      scanHistoryId: scanHistory.id,
      orderId: scanHistory.orderId ?? null,
      intention: input.payload.intention,
    },
    ["worker"],
  );

  await scheduleRoleNotification(input.shopId, "worker");

  logger.info("Mark logistic intention completed", {
    shopId: input.shopId,
    scanHistoryId: scanHistory.id,
    intention: input.payload.intention,
  });

  return { scheduledDate: input.payload.scheduledDate ?? null };
};
