import { logger } from "../../../shared/logging/logger.js";
import { outboundWebhookQueue } from "../../../shared/queue/outbound-webhook-queue.js";
import type { OutboundEventType } from "../contracts/outbound-webhook.contract.js";
import { outboundWebhookTargetRepository } from "../repositories/outbound-webhook-target.repository.js";

export const enqueueOutboundEventService = async (input: {
  shopId: string;
  eventType: OutboundEventType;
  payload: unknown;
}): Promise<void> => {
  const targets = await outboundWebhookTargetRepository.findActiveByShopAndEvent(
    {
      shopId: input.shopId,
      eventType: input.eventType,
    },
  );

  if (targets.length === 0) {
    return;
  }

  await Promise.all(
    targets.map((target) =>
      outboundWebhookQueue.add(`${input.eventType}:${target.id}`, {
        targetId: target.id,
        targetUrl: target.targetUrl,
        secret: target.secret,
        eventPayload: input.payload,
      }),
    ),
  );

  logger.info("Outbound webhook jobs enqueued", {
    shopId: input.shopId,
    eventType: input.eventType,
    targetCount: targets.length,
  });
};
