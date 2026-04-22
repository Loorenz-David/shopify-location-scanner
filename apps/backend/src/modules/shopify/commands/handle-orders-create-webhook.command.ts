import { prisma } from "../../../shared/database/prisma-client.js";
import { env } from "../../../config/env.js";
import { logger } from "../../../shared/logging/logger.js";
import {
  classifyShopifyOrderChannel,
  type SalesChannel,
} from "../../../shared/sales-channel/classify-sales-channel.js";
import { scanHistoryRepository } from "../../scanner/repositories/scan-history.repository.js";
import type { ShopifyOrdersCreateWebhookPayload } from "../contracts/shopify.contract.js";
import { applyOrderMarkersCommand } from "./apply-order-markers.command.js";
import {
  isInternalMarker,
  parseOrderMarkers,
} from "../domain/order-marker.js";
import { buildOrderWebhookLineItemDebugSummary } from "../domain/order-webhook-debug.js";
import { loadProductSnapshotsForOrderService } from "../services/load-product-snapshots-for-order.service.js";

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

const parseOrderDate = (payload: ShopifyOrdersCreateWebhookPayload): Date => {
  const rawDate =
    payload.processed_at ?? payload.created_at ?? payload.updated_at;
  if (!rawDate) {
    return new Date();
  }

  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const handleOrdersCreateWebhookCommand = async (input: {
  shopId: string;
  shopDomain: string;
  topic: string;
  webhookId: string;
  payload: ShopifyOrdersCreateWebhookPayload;
}): Promise<{
  skipped: boolean;
  duplicate: boolean;
  processedProducts: number;
  skippedProducts: number;
}> => {
  if (input.payload.financial_status !== "paid") {
    logger.info("Skipping orders/create webhook: financial_status is not paid", {
      shopId: input.shopId,
      shopDomain: input.shopDomain,
      webhookId: input.webhookId,
      financial_status: input.payload.financial_status ?? null,
    });

    return {
      skipped: true,
      duplicate: false,
      processedProducts: 0,
      skippedProducts: 0,
    };
  }

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
      skipped: false,
      duplicate: true,
      processedProducts: 0,
      skippedProducts: 0,
    };
  }

  const happenedAt = parseOrderDate(input.payload);
  const orderId = String(input.payload.id);
  const orderNumber = input.payload.order_number ?? null;
  const orderGroupId = `order:${orderId}`;
  const soldLocation = `SOLD_ORDER:${orderId}`;
  const salesChannel: SalesChannel = classifyShopifyOrderChannel({
    sourceName: input.payload.source_name,
    appId: input.payload.app_id,
    noteAttributes: input.payload.note_attributes,
  });
  const markers = parseOrderMarkers(input.payload.line_items);
  const internalMarkerCount = input.payload.line_items.filter((lineItem) =>
    isInternalMarker(lineItem),
  ).length;

  if (env.SHOPIFY_DEBUG_ORDER_WEBHOOKS) {
    logger.info("Received Shopify orders/create webhook payload", {
      shopId: input.shopId,
      shopDomain: input.shopDomain,
      topic: input.topic,
      webhookId: input.webhookId,
      orderId,
      orderNumber,
      salesChannel,
      financialStatus: input.payload.financial_status ?? null,
      lineItemCount: input.payload.line_items.length,
      markers,
      lineItems: buildOrderWebhookLineItemDebugSummary(input.payload.line_items),
    });
  }

  const lineItemsByProduct = new Map<
    string,
    {
      sku: string | null;
      barcode: string | null;
      price: string | null;
      title: string;
    }
  >();
  let skippedProducts = 0;

  for (const lineItem of input.payload.line_items) {
    if (isInternalMarker(lineItem)) {
      continue;
    }

    if (!lineItem.product_id) {
      skippedProducts += 1;
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
  const productSnapshots = await loadProductSnapshotsForOrderService({
    shopId: input.shopId,
    shopDomain: input.shopDomain,
    productIds: [...lineItemsByProduct.keys()],
  });

  for (const [productId, lineItem] of lineItemsByProduct.entries()) {
    const productSnapshot = productSnapshots.get(productId);
    await scanHistoryRepository.appendSoldTerminalEventWithFallback({
      shopId: input.shopId,
      userId: null,
      username: WEBHOOK_ACTOR,
      productId,
      itemSku: productSnapshot?.sku ?? lineItem.sku,
      itemBarcode: productSnapshot?.barcode ?? lineItem.barcode,
      itemImageUrl: productSnapshot?.imageUrl ?? null,
      itemType: "product_id",
      itemTitle: productSnapshot?.title ?? lineItem.title,
      itemCategory: productSnapshot?.itemCategory ?? null,
      itemHeight: productSnapshot?.itemHeight ?? null,
      itemWidth: productSnapshot?.itemWidth ?? null,
      itemDepth: productSnapshot?.itemDepth ?? null,
      volume: productSnapshot?.volume ?? null,
      soldPrice: lineItem.price,
      orderId,
      orderNumber,
      orderGroupId,
      unknownLocation: UNKNOWN_POSITION_LOCATION,
      soldLocation,
      happenedAt,
      salesChannel,
    });

    processedProducts += 1;
  }

  if (processedProducts > 0) {
    await applyOrderMarkersCommand({
      shopId: input.shopId,
      orderId,
      markers,
    });
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

  logger.info("Processed Shopify orders/create webhook", {
    shopId: input.shopId,
    shopDomain: input.shopDomain,
    topic: input.topic,
    webhookId: input.webhookId,
    orderId: String(input.payload.id),
    hasMarkerIntention: markers.intention !== null,
    intention: markers.intention,
    fixItem: markers.fixItem,
    internalMarkerCount,
    processedProducts,
    skippedProducts,
  });

  return {
    skipped: false,
    duplicate: false,
    processedProducts,
    skippedProducts,
  };
};
