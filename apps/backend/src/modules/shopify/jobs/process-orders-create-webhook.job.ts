import type { WebhookIntakeRecord } from "@prisma/client";
import {
  ShopifyOrdersCreateWebhookPayloadSchema,
  type ShopifyOrdersCreateWebhookPayload,
} from "../contracts/shopify.contract.js";
import { handleOrdersCreateWebhookCommand } from "../commands/handle-orders-create-webhook.command.js";

const parsePayload = (rawPayload: string): ShopifyOrdersCreateWebhookPayload =>
  ShopifyOrdersCreateWebhookPayloadSchema.parse(JSON.parse(rawPayload) as unknown);

export const processOrdersCreateWebhookJob = async (
  intake: WebhookIntakeRecord,
): Promise<void> => {
  const payload = parsePayload(intake.rawPayload);

  await handleOrdersCreateWebhookCommand({
    shopId: intake.shopId,
    shopDomain: intake.shopDomain,
    topic: intake.topic,
    webhookId: intake.webhookId,
    payload,
  });
};
