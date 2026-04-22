import type { WebhookIntakeRecord } from "@prisma/client";
import {
  ShopifyOrdersPaidWebhookPayloadSchema,
  type ShopifyOrdersPaidWebhookPayload,
} from "../contracts/shopify.contract.js";
import { handleOrdersPaidWebhookCommand } from "../commands/handle-orders-paid-webhook.command.js";

const parsePayload = (rawPayload: string): ShopifyOrdersPaidWebhookPayload =>
  ShopifyOrdersPaidWebhookPayloadSchema.parse(JSON.parse(rawPayload) as unknown);

export const processOrdersPaidWebhookJob = async (
  intake: WebhookIntakeRecord,
): Promise<void> => {
  const payload = parsePayload(intake.rawPayload);

  await handleOrdersPaidWebhookCommand({
    shopId: intake.shopId,
    shopDomain: intake.shopDomain,
    topic: intake.topic,
    webhookId: intake.webhookId,
    payload,
  });
};
