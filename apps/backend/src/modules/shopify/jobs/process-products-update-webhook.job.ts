import type { WebhookIntakeRecord } from "@prisma/client";
import { scanHistoryRepository } from "../../scanner/repositories/scan-history.repository.js";
import type { ShopifyProductsUpdateWebhookPayload } from "../contracts/shopify.contract.js";
import { ShopifyProductsUpdateWebhookPayloadSchema } from "../contracts/shopify.contract.js";
import { shopifyAdminApi } from "../integrations/shopify-admin-api.integration.js";
import { shopRepository } from "../repositories/shop.repository.js";

const WEBHOOK_ACTOR = "system:shopify-webhook";

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

// broadcast is injected by the caller so the job processor has no dependency on
// the in-process WebSocket registry. In the worker process the caller publishes
// over Redis; in the API server process (if ever called directly) it can call
// broadcastToShop. This keeps the job testable and process-agnostic.
export const processProductsUpdateWebhookJob = async (
  intake: WebhookIntakeRecord,
  broadcast: (shopId: string, event: { type: string } & Record<string, unknown>) => Promise<void> | void,
): Promise<void> => {
  const parsedBody = JSON.parse(intake.rawPayload) as unknown;
  const payload = ShopifyProductsUpdateWebhookPayloadSchema.parse(parsedBody);
  const productId = normalizeProductId(payload.id);
  const price = getWebhookPrice(payload);
  const happenedAt = parseHappenedAt(payload);
  let priceUpdated = false;
  let locationUpdated = false;

  if (price) {
    priceUpdated = await scanHistoryRepository.appendPriceChangeIfHistoryExists({
      shopId: intake.shopId,
      productId,
      price,
      happenedAt,
      emitBroadcast: false,
    });
  }

  const existingHistory = await scanHistoryRepository.findByShopAndProduct({
    shopId: intake.shopId,
    productId,
  });

  if (existingHistory && !existingHistory.isSold) {
    const shop = await shopRepository.findById(intake.shopId);

    if (shop?.accessToken) {
      const product = await shopifyAdminApi.getProductWithLocation({
        shopDomain: shop.shopDomain,
        accessToken: shop.accessToken,
        productId,
      });

      const normalizedLocation = product.location?.trim() || null;
      const previousLocation = existingHistory.latestLocation?.trim() || null;

      if (normalizedLocation && normalizedLocation !== previousLocation) {
        await scanHistoryRepository.appendLocationEvent({
          shopId: intake.shopId,
          userId: null,
          username: WEBHOOK_ACTOR,
          currentPrice: product.price,
          itemHeight: product.itemHeight,
          itemWidth: product.itemWidth,
          itemDepth: product.itemDepth,
          volume: product.volume,
          productId,
          itemCategory: product.itemCategory,
          itemSku: product.sku,
          itemBarcode: product.barcode,
          itemImageUrl: product.imageUrl,
          itemType: "product_id",
          itemTitle: product.title,
          location: normalizedLocation,
          happenedAt,
        });

        locationUpdated = true;
      }
    }
  }

  if (priceUpdated || locationUpdated) {
    await broadcast(intake.shopId, {
      type: "scan_history_updated",
      productId,
    });
  }
};
