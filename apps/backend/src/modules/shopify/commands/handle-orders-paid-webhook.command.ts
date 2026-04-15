import { prisma } from "../../../shared/database/prisma-client.js";
import { logger } from "../../../shared/logging/logger.js";
import {
  classifyShopifyOrderChannel,
  type SalesChannel,
} from "../../../shared/sales-channel/classify-sales-channel.js";
import { scanHistoryRepository } from "../../scanner/repositories/scan-history.repository.js";
import type { ShopifyOrdersPaidWebhookPayload } from "../contracts/shopify.contract.js";

const WEBHOOK_ACTOR = "system:shopify-webhook";
const UNKNOWN_POSITION_LOCATION = "UNKNOWN_POSITION";

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

const parsePaidDate = (payload: ShopifyOrdersPaidWebhookPayload): Date => {
  const rawDate =
    payload.processed_at ?? payload.updated_at ?? payload.created_at;
  if (!rawDate) {
    return new Date();
  }

  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const handleOrdersPaidWebhookCommand = async (input: {
  shopId: string;
  shopDomain: string;
  topic: string;
  webhookId: string;
  payload: ShopifyOrdersPaidWebhookPayload;
}): Promise<{
  duplicate: boolean;
  processedProducts: number;
  skippedProducts: number;
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
      processedProducts: 0,
      skippedProducts: 0,
    };
  }

  const paidAt = parsePaidDate(input.payload);
  const orderId = String(input.payload.id);
  const orderNumber = input.payload.order_number ?? null;
  const orderGroupId = `order:${orderId}`;
  const soldLocation = `SOLD_ORDER:${orderId}`;
  const salesChannel: SalesChannel = classifyShopifyOrderChannel({
    sourceName: input.payload.source_name,
    appId: input.payload.app_id,
    noteAttributes: input.payload.note_attributes,
  });

  const lineItemsByProduct = new Map<
    string,
    {
      sku: string | null;
      barcode: string | null;
      price: string | null;
      title: string;
    }
  >();

  for (const lineItem of input.payload.line_items) {
    if (!lineItem.product_id) {
      continue;
    }

    const productId = normalizeProductId(lineItem.product_id);
    if (!lineItemsByProduct.has(productId)) {
      lineItemsByProduct.set(productId, {
        sku: lineItem.sku ?? null,
        barcode: lineItem.barcode ?? null,
        price: lineItem.price ?? null,
        title: lineItem.title,
      });
    }
  }

  let processedProducts = 0;

  for (const [productId, lineItem] of lineItemsByProduct.entries()) {
    await scanHistoryRepository.appendSoldTerminalEventWithFallback({
      shopId: input.shopId,
      userId: null,
      username: WEBHOOK_ACTOR,
      productId,
      itemSku: lineItem.sku,
      itemBarcode: lineItem.barcode,
      itemImageUrl: null,
      itemType: "product_id",
      itemTitle: lineItem.title,
      soldPrice: lineItem.price,
      orderId,
      orderNumber,
      orderGroupId,
      unknownLocation: UNKNOWN_POSITION_LOCATION,
      soldLocation,
      happenedAt: paidAt,
      salesChannel,
    });

    processedProducts += 1;
  }

  try {
    await prisma.shopifyWebhookDelivery.create({
      data: {
        shopId: input.shopId,
        topic: input.topic,
        webhookId: input.webhookId,
        orderId: String(input.payload.id),
      },
    });
  } catch (error) {
    logger.warn("Shopify webhook delivery log already exists", {
      shopId: input.shopId,
      topic: input.topic,
      webhookId: input.webhookId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  const skippedProducts = input.payload.line_items.length - processedProducts;

  logger.info("Processed Shopify orders/paid webhook", {
    shopId: input.shopId,
    shopDomain: input.shopDomain,
    topic: input.topic,
    webhookId: input.webhookId,
    orderId: String(input.payload.id),
    processedProducts,
    skippedProducts,
  });

  return {
    duplicate: false,
    processedProducts,
    skippedProducts,
  };
};
