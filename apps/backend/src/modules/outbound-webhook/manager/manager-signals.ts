import { logger } from "../../../shared/logging/logger.js";
import { outboundWebhookTargetRepository } from "../repositories/outbound-webhook-target.repository.js";
import { outboundDeliveryRepository } from "../repositories/outbound-delivery.repository.js";
import { addProcessed, addStockSync, closeManagerQueues } from "./manager-queues.js";
let enabled = false;
export const enableManagerSignals = (): void => { if (!enabled) { enabled = true; logger.info("Manager signals enabled"); } };
export const closeManagerSignals = async (): Promise<void> => { enabled = false; await closeManagerQueues(); };
export const signalStockChanged = (shopId: string): void => { if (!enabled) return; void addStockSync(shopId).catch((error) => logger.error("Manager stock signal failed", { shopId, error: String(error) })); };
export const signalItemProcessed = (input: { shopId: string; scanHistoryId: string; itemBarcode: string | null }): void => { if (!enabled) return; void (async () => {
  const targets = await outboundWebhookTargetRepository.findActiveByShopAndEvent({ shopId: input.shopId, eventType: "items_processed" });
  for (const target of targets) {
    const blank = !input.itemBarcode || input.itemBarcode.trim() === "";
    const delivery = await outboundDeliveryRepository.create({ shopId: input.shopId, targetId: target.id, eventType: "items_processed", subjectKey: blank ? null : input.itemBarcode, status: blank ? "skipped" : "pending", requestBody: blank ? "[]" : JSON.stringify([{ article_number: input.itemBarcode }]), lastError: blank ? "no_article_number" : null });
    if (!blank) await addProcessed(delivery.id);
  }
})().catch((error) => logger.error("Manager processed signal failed", { shopId: input.shopId, error: String(error) })); };
