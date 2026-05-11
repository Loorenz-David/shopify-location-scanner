import { logger } from "../../../shared/logging/logger.js";
import { markLogisticIntentionCommand } from "../../logistic/commands/mark-logistic-intention.command.js";
import { scanHistoryRepository } from "../../scanner/repositories/scan-history.repository.js";
import {
  parseOrderTags,
  type ParsedOrderMarkers,
} from "../domain/order-marker.js";

const MARKER_ACTOR = "system:shopify-marker";

export const applyOrderMarkersCommand = async (input: {
  shopId: string;
  orderId: string;
  markers: ParsedOrderMarkers;
  tags?: string[];
}): Promise<void> => {
  const { shopId, orderId, markers } = input;
  const parsedTags = parseOrderTags(input.tags);
  const resolvedIntention = parsedTags.intention ?? markers.intention;
  const resolvedScheduledDate = parsedTags.scheduledDate;

  if (!resolvedIntention && !markers.fixItem && !resolvedScheduledDate) {
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
      intention: resolvedIntention,
      fixItem: markers.fixItem,
      scheduledDate: resolvedScheduledDate,
    });
    return;
  }

  if (resolvedIntention) {
    for (const scanHistoryId of scanHistoryIds) {
      await markLogisticIntentionCommand({
        shopId,
        username: MARKER_ACTOR,
        payload: {
          scanHistoryId,
          intention: resolvedIntention,
          fixItem: markers.fixItem,
          fixNotes: undefined,
          scheduledDate: resolvedScheduledDate ?? undefined,
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
    markerIntention: markers.intention,
    tagIntention: parsedTags.intention,
    resolvedIntention,
    fixItem: markers.fixItem,
    scheduledDate: resolvedScheduledDate,
    itemCount: scanHistoryIds.length,
  });
};
