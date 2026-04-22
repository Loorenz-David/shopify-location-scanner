import {
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/http-errors.js";
import { prisma } from "../../../shared/database/prisma-client.js";
import { logger } from "../../../shared/logging/logger.js";
import { broadcastToShop } from "../../ws/ws-broadcaster.js";
import { logisticEventRepository } from "../repositories/logistic-event.repository.js";
import { logisticLocationRepository } from "../repositories/logistic-location.repository.js";
import { scheduleRoleNotification } from "../services/logistic-notification.service.js";
import type { MarkPlacementInput } from "../contracts/logistic.contract.js";
import type { UserRole } from "@prisma/client";
import type { ItemPlacedPayload } from "../../outbound-webhook/contracts/outbound-webhook.contract.js";
import { enqueueOutboundEventService } from "../../outbound-webhook/services/enqueue-outbound-event.service.js";

export const markLogisticPlacementCommand = async (input: {
  shopId: string;
  username: string;
  callerRole: UserRole;
  payload: MarkPlacementInput;
}): Promise<{
  scanHistoryId: string;
  lastLogisticEventType: string;
  logisticLocationId: string;
}> => {
  logger.info("Mark logistic placement started", {
    shopId: input.shopId,
    scanHistoryId: input.payload.scanHistoryId,
    logisticLocationId: input.payload.logisticLocationId,
  });

  const location = await logisticLocationRepository.findById({
    id: input.payload.logisticLocationId,
    shopId: input.shopId,
  });

  if (!location) {
    throw new NotFoundError("Logistic location not found for this shop");
  }

  const scanHistory = await prisma.scanHistory.findFirst({
    where: {
      id: input.payload.scanHistoryId,
      shopId: input.shopId,
      isSold: true,
      intention: { not: null },
    },
    select: {
      id: true,
      orderId: true,
      itemSku: true,
      fixItem: true,
      logisticsCompletedAt: true,
    },
  });

  if (!scanHistory) {
    throw new NotFoundError("Sold item with intention not found for this shop");
  }

  if (scanHistory.logisticsCompletedAt) {
    throw new ValidationError("Item logistics are already completed");
  }

  await logisticEventRepository.appendEvent({
    scanHistoryId: scanHistory.id,
    shopId: input.shopId,
    orderId: scanHistory.orderId ?? null,
    logisticLocationId: input.payload.logisticLocationId,
    username: input.username,
    eventType: "placed",
  });

  // Route broadcast by caller role
  const fixItem = scanHistory.fixItem ?? false;

  if (input.callerRole === "seller") {
    broadcastToShop(
      input.shopId,
      {
        type: "logistic_item_placed",
        scanHistoryId: scanHistory.id,
        orderId: scanHistory.orderId ?? null,
        logisticLocationId: input.payload.logisticLocationId,
      },
      ["worker"],
    );
    await scheduleRoleNotification(input.shopId, "worker");
  } else if (input.callerRole === "worker") {
    if (fixItem) {
      broadcastToShop(
        input.shopId,
        {
          type: "logistic_item_placed",
          scanHistoryId: scanHistory.id,
          orderId: scanHistory.orderId ?? null,
          logisticLocationId: input.payload.logisticLocationId,
        },
        ["manager"],
      );
      await scheduleRoleNotification(input.shopId, "manager");
    } else {
      broadcastToShop(
        input.shopId,
        {
          type: "logistic_item_placed",
          scanHistoryId: scanHistory.id,
          orderId: scanHistory.orderId ?? null,
          logisticLocationId: input.payload.logisticLocationId,
        },
        ["seller"],
      );
    }
  } else if (input.callerRole === "manager") {
    broadcastToShop(
      input.shopId,
      {
        type: "logistic_item_placed",
        scanHistoryId: scanHistory.id,
        orderId: scanHistory.orderId ?? null,
        logisticLocationId: input.payload.logisticLocationId,
      },
      ["seller"],
    );
  }

  logger.info("Mark logistic placement completed", {
    shopId: input.shopId,
    scanHistoryId: scanHistory.id,
    logisticLocationId: input.payload.logisticLocationId,
  });

  const outboundPayload: ItemPlacedPayload = {
    event: "item_placed",
    shopId: input.shopId,
    scanHistoryId: scanHistory.id,
    orderId: scanHistory.orderId ?? null,
    itemSku: scanHistory.itemSku ?? null,
    logisticLocation: {
      id: location.id,
      location: location.location,
      updatedAt: location.updatedAt.toISOString(),
    },
  };

  void enqueueOutboundEventService({
    shopId: input.shopId,
    eventType: "item_placed",
    payload: outboundPayload,
  }).catch((error) => {
    logger.error("Failed to enqueue outbound webhook jobs", {
      shopId: input.shopId,
      scanHistoryId: scanHistory.id,
      error: error instanceof Error ? error.message : "unknown",
    });
  });

  return {
    scanHistoryId: scanHistory.id,
    lastLogisticEventType: "placed",
    logisticLocationId: input.payload.logisticLocationId,
  };
};
