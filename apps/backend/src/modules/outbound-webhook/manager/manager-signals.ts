import { logger } from "../../../shared/logging/logger.js";
import { outboundDeliveryRepository } from "../repositories/outbound-delivery.repository.js";
import { outboundWebhookTargetRepository } from "../repositories/outbound-webhook-target.repository.js";
import {
  closeManagerQueues,
  enqueueItemsProcessed,
  enqueueStockSync,
} from "./manager-queues.js";

/**
 * §12A.5: signals are enabled per process. Before `enableManagerSignals()` every
 * signal is a silent no-op — nothing written, no Redis connection, nothing logged.
 * That is what keeps `restore-scan-history` from reporting (Card 7) and what lets
 * every `verify-*` script and `rebuild-location-stock` exit on their own.
 */
let enabled = false;

/**
 * Signals are fire-and-forget, so `closeManagerSignals` has to wait for the ones
 * already in flight. Closing the queues underneath a signal that has not reached
 * its enqueue yet loses the report *and* makes the next enqueue re-open a lazy
 * connection nothing will close again — the process would then never exit, which
 * is exactly what §12A.5 requires of `reconcile-active-sold-items`.
 */
const inFlight = new Set<Promise<void>>();

const track = (task: Promise<void>): void => {
  inFlight.add(task);
  void task.finally(() => {
    inFlight.delete(task);
  });
};

export const enableManagerSignals = (): void => {
  if (enabled) {
    return;
  }
  enabled = true;
  logger.info("Manager signals enabled");
};

export const closeManagerSignals = async (): Promise<void> => {
  enabled = false;
  // `enabled` is already false, so no further signal can start; the loop only
  // has to drain what was in flight when this was called.
  while (inFlight.size > 0) {
    await Promise.allSettled([...inFlight]);
  }
  await closeManagerQueues();
};

export const managerSignalsEnabled = (): boolean => enabled;

/**
 * §12A.10. Carries only `shopId` — never numbers and never identities; everything
 * is read when the sync runs (handoff v2 §6.3). Never throws and is never awaited
 * by the caller, so a Redis outage cannot break a scan, an order webhook or a
 * stock edit (HC-4).
 */
export const signalStockChanged = (shopId: string): void => {
  if (!enabled) {
    return;
  }

  track(
    enqueueStockSync(shopId).catch((error: unknown) => {
      logger.error("Manager stock signal could not be enqueued", {
        shopId,
        error: error instanceof Error ? error.message : String(error ?? "unknown"),
      });
    }),
  );
};

/**
 * §12A.6, called after a ScanHistory row was created and committed. One delivery
 * row per (report, target), one article per request; a blank article number is
 * recorded as `skipped` so the gap is visible instead of silent (HC-5).
 */
export const signalItemProcessed = (input: {
  shopId: string;
  scanHistoryId: string;
  itemBarcode: string | null;
}): void => {
  if (!enabled) {
    return;
  }

  track(
    (async () => {
      const targets = await outboundWebhookTargetRepository.findActiveByShopAndEvent({
        shopId: input.shopId,
        eventType: "items_processed",
      });

      if (targets.length === 0) {
        return;
      }

      const barcode = input.itemBarcode;
      const isBlank = barcode === null || barcode.trim() === "";

      for (const target of targets) {
        if (isBlank) {
          await outboundDeliveryRepository.create({
            shopId: input.shopId,
            targetId: target.id,
            eventType: "items_processed",
            subjectKey: null,
            status: "skipped",
            requestBody: "[]",
            lastError: "no_article_number",
            completedAt: new Date(),
          });
          continue;
        }

        // HC-5: `subjectKey` and the body carry the stored value verbatim — not
        // trimmed, not reformatted — so M4's byte identity holds.
        const delivery = await outboundDeliveryRepository.create({
          shopId: input.shopId,
          targetId: target.id,
          eventType: "items_processed",
          subjectKey: barcode,
          status: "pending",
          requestBody: JSON.stringify([{ article_number: barcode }]),
        });

        // The row exists before the enqueue, so a Redis outage here costs nothing:
        // §12A.7 re-drives a `pending` row that is older than five minutes.
        try {
          await enqueueItemsProcessed(delivery.id);
        } catch (error: unknown) {
          logger.error("Manager processed report could not be enqueued", {
            shopId: input.shopId,
            deliveryId: delivery.id,
            error: error instanceof Error ? error.message : String(error ?? "unknown"),
          });
        }
      }
    })().catch((error: unknown) => {
      logger.error("Manager processed signal failed", {
        shopId: input.shopId,
        scanHistoryId: input.scanHistoryId,
        error: error instanceof Error ? error.message : String(error ?? "unknown"),
      });
    }),
  );
};
