import { logger } from "../../../shared/logging/logger.js";
import { markLogisticIntentionCommand } from "../../logistic/commands/mark-logistic-intention.command.js";
import { scanHistoryRepository } from "../../scanner/repositories/scan-history.repository.js";
import type { ParsedOrderMarkers } from "../domain/order-marker.js";

const MARKER_ACTOR = "system:shopify-marker";

export const applyOrderMarkersCommand = async (input: {
  shopId: string;
  orderId: string;
  markers: ParsedOrderMarkers;
}): Promise<void> => {
  const { shopId, orderId, markers } = input;

  if (!markers.intention && !markers.fixItem) {
    return;
  }

  const scanHistoryIds = await scanHistoryRepository.findActiveSoldIdsByOrder({
    shopId,
    orderId,
  });

  if (scanHistoryIds.length === 0) {
    logger.warn("No eligible sold items found for order markers", {
      shopId,
      orderId,
      intention: markers.intention,
      fixItem: markers.fixItem,
    });
    return;
  }

  if (markers.intention) {
    for (const scanHistoryId of scanHistoryIds) {
      await markLogisticIntentionCommand({
        shopId,
        username: MARKER_ACTOR,
        payload: {
          scanHistoryId,
          intention: markers.intention,
          fixItem: markers.fixItem,
          fixNotes: undefined,
          scheduledDate: undefined,
        },
      });
    }
  } else if (markers.fixItem) {
    await scanHistoryRepository.updateFixItemForIds({
      shopId,
      scanHistoryIds,
      fixItem: true,
    });
  }

  logger.info("Applied Shopify order markers", {
    shopId,
    orderId,
    intention: markers.intention,
    fixItem: markers.fixItem,
    itemCount: scanHistoryIds.length,
  });
};
