import { prisma } from "../../../shared/database/prisma-client.js";
import { logger } from "../../../shared/logging/logger.js";
import { scanHistoryRepository } from "../../scanner/repositories/scan-history.repository.js";
import type { ShopifyProductsUpdateWebhookPayload } from "../contracts/shopify.contract.js";

const normalizeProductId = (rawProductId: number | string): string => {
  const asString = String(rawProductId).trim();

  if (asString.startsWith("gid://shopify/Product/")) {
    return asString;
  }

  if (/^\d+$/.test(asString)) {
    return `gid://shopify/Product/${asString}`;
  }

  return asString;
};

const getWebhookPrice = (
  payload: ShopifyProductsUpdateWebhookPayload,
): string | null => {
  const variantWithPrice = payload.variants?.find((variant) => {
    const price = variant.price?.trim();
    return Boolean(price);
  });

  return variantWithPrice?.price?.trim() ?? null;
};

const parseHappenedAt = (
  payload: ShopifyProductsUpdateWebhookPayload,
): Date => {
  const rawDate = payload.updated_at;
  if (!rawDate) {
    return new Date();
  }

  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const handleProductsUpdateWebhookCommand = async (input: {
  shopId: string;
  shopDomain: string;
  topic: string;
  webhookId: string;
  payload: ShopifyProductsUpdateWebhookPayload;
}): Promise<{
  duplicate: boolean;
  applied: boolean;
}> => {
  const existing = await prisma.shopifyWebhookDelivery.findUnique({
    where: {
      shopId_topic_webhookId: {
        shopId: input.shopId,
        topic: input.topic,
        webhookId: input.webhookId,
      },
    },
  });

  if (existing) {
    return {
      duplicate: true,
      applied: false,
    };
  }

  const productId = normalizeProductId(input.payload.id);
  const price = getWebhookPrice(input.payload);
  let applied = false;

  if (price) {
    applied = await scanHistoryRepository.appendPriceChangeIfHistoryExists({
      shopId: input.shopId,
      productId,
      price,
      happenedAt: parseHappenedAt(input.payload),
    });
  }

  await prisma.shopifyWebhookDelivery.create({
    data: {
      shopId: input.shopId,
      topic: input.topic,
      webhookId: input.webhookId,
    },
  });

  logger.info("Processed Shopify products/update webhook", {
    shopId: input.shopId,
    shopDomain: input.shopDomain,
    topic: input.topic,
    webhookId: input.webhookId,
    productId,
    applied,
  });

  return {
    duplicate: false,
    applied,
  };
};
