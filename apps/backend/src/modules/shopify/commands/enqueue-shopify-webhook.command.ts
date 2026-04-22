import { logger } from "../../../shared/logging/logger.js";
import { webhookQueue } from "../../../shared/queue/index.js";
import { webhookIntakeRepository } from "../repositories/webhook-intake.repository.js";

export const enqueueShopifyWebhookCommand = async (input: {
  shopId: string;
  shopDomain: string;
  topic: string;
  webhookId: string;
  rawPayload: string;
}): Promise<{ intakeId: string; duplicate: boolean }> => {
  const { id: intakeId, isDuplicate } =
    await webhookIntakeRepository.createIntakeRecord({
      shopId: input.shopId,
      shopDomain: input.shopDomain,
      topic: input.topic,
      webhookId: input.webhookId,
      rawPayload: input.rawPayload,
    });

  await webhookQueue.add(
    input.topic,
    {
      intakeId,
    },
    {
      jobId: intakeId,
    },
  );

  logger.info("Accepted Shopify webhook for async processing", {
    shopId: input.shopId,
    shopDomain: input.shopDomain,
    topic: input.topic,
    webhookId: input.webhookId,
    intakeId,
    duplicate: isDuplicate,
  });

  return {
    intakeId,
    duplicate: isDuplicate,
  };
};
