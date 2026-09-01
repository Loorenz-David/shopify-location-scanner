import type { WebhookIntakeRecord } from "@prisma/client";
import { scanHistoryRepository } from "../../scanner/repositories/scan-history.repository.js";
import type { ShopifyProductsUpdateWebhookPayload } from "../contracts/shopify.contract.js";
import { ShopifyProductsUpdateWebhookPayloadSchema } from "../contracts/shopify.contract.js";
import { shopifyAdminApi } from "../integrations/shopify-admin-api.integration.js";
import { shopRepository } from "../repositories/shop.repository.js";
import { logger } from "../../../shared/logging/logger.js";
import { itemPropertiesResolver } from "../../../shared/item-properties/item-properties-resolver.service.js";
import {
  applyItemStockChange,
  toStockItemSnapshot,
} from "../../stock/services/apply-item-stock-change.service.js";

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

const isActiveProductStatus = (
  status: "ACTIVE" | "DRAFT" | "ARCHIVED" | "UNLISTED" | "UNKNOWN",
): boolean => status === "ACTIVE";

// broadcast is injected by the caller so the job processor has no dependency on
// the in-process WebSocket registry. In the worker process the caller publishes
// over Redis; in the API server process (if ever called directly) it can call
// broadcastToShop. This keeps the job testable and process-agnostic.
export const processProductsUpdateWebhookJob = async (
  intake: WebhookIntakeRecord,
  broadcast: (
    shopId: string,
    event: { type: string } & Record<string, unknown>,
  ) => Promise<void> | void,
): Promise<void> => {
  const parsedBody = JSON.parse(intake.rawPayload) as unknown;
  const payload = ShopifyProductsUpdateWebhookPayloadSchema.parse(parsedBody);
  const productId = normalizeProductId(payload.id);
  const price = getWebhookPrice(payload);
  const happenedAt = parseHappenedAt(payload);
  let priceUpdated = false;
  let locationUpdated = false;
  let productSnapshotUpdated = false;

  if (price) {
    priceUpdated = await scanHistoryRepository.appendPriceChangeIfHistoryExists(
      {
        shopId: intake.shopId,
        productId,
        price,
        happenedAt,
        emitBroadcast: false,
      },
    );
  }

  const existingHistory = await scanHistoryRepository.findByShopAndProduct({
    shopId: intake.shopId,
    productId,
  });

  if (existingHistory?.isSold) {
    const shop = await shopRepository.findById(intake.shopId);

    if (shop?.accessToken) {
      const product = await shopifyAdminApi.getProductWithLocation({
        shopDomain: shop.shopDomain,
        accessToken: shop.accessToken,
        productId,
      });

      productSnapshotUpdated =
        await scanHistoryRepository.syncSoldQuantityIfHistoryExists({
          shopId: intake.shopId,
          productId,
          quantity: product.quantity,
          emitBroadcast: false,
        });
    }
  }

  if (!existingHistory || !existingHistory.isSold) {
    const shop = await shopRepository.findById(intake.shopId);

    if (shop?.accessToken) {
      // This branch writes ScanHistory.properties, so it needs the full
      // metafield set. The sold-item branch above only reads quantity.
      const product = await shopifyAdminApi.getProductWithLocation({
        shopDomain: shop.shopDomain,
        accessToken: shop.accessToken,
        productId,
        includeMetafieldProperties: true,
      });

      // Resolved once for every write branch below. A barcode change arriving
      // on this very webhook is picked up automatically: the lookup keys off
      // the freshly fetched product, not the stored itemBarcode.
      const properties = await itemPropertiesResolver.resolve({
        metafieldProperties: product.metafieldProperties,
        articleNumber: product.barcode,
      });

      if (!isActiveProductStatus(product.status)) {
        logger.info(
          "Skipping Shopify products/update snapshot sync for non-active product",
          {
            shopId: intake.shopId,
            productId,
            status: product.status,
          },
        );
      } else {
        const normalizedLocation = product.location?.trim() || null;

        if (!existingHistory) {
          if (normalizedLocation) {
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
              quantity: product.quantity,
              properties: properties ?? undefined,
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
          } else {
            logger.info(
              "Skipping Shopify products/update history create: no location set",
              {
                shopId: intake.shopId,
                productId,
              },
            );
          }
        } else {
          const previousLocation =
            existingHistory.latestLocation?.trim() || null;

          productSnapshotUpdated =
            await scanHistoryRepository.syncProductSnapshotIfHistoryExists({
              shopId: intake.shopId,
              productId,
              itemCategory: product.itemCategory,
              itemSku: product.sku,
              itemBarcode: product.barcode,
              itemImageUrl: product.imageUrl,
              itemType: "product_id",
              itemTitle: product.title,
              itemHeight: product.itemHeight,
              itemWidth: product.itemWidth,
              itemDepth: product.itemDepth,
              volume: product.volume,
              quantity: product.quantity,
              properties: properties ?? undefined,
              emitBroadcast: false,
            });

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
              quantity: product.quantity,
              properties: properties ?? undefined,
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
    }
  }

  const afterHistory = await scanHistoryRepository.findByShopAndProduct({
    shopId: intake.shopId,
    productId,
  });
  const scanHistoryId = afterHistory?.id ?? existingHistory?.id;
  const stockChange = await applyItemStockChange({
    shopId: intake.shopId,
    before: toStockItemSnapshot(existingHistory),
    after: toStockItemSnapshot(afterHistory),
    operation: "products_update_sync",
    itemIdentifiers: {
      productId,
      ...(scanHistoryId !== undefined ? { scanHistoryId } : {}),
    },
  });
  logger.info("Stock change applied for Shopify products/update", {
    shopId: intake.shopId,
    productId,
    scanHistoryId: afterHistory?.id ?? existingHistory?.id ?? null,
    operation: "products_update_sync",
    changed: stockChange.changed,
  });

  if (priceUpdated || locationUpdated || productSnapshotUpdated) {
    await broadcast(intake.shopId, {
      type: "scan_history_updated",
      productId,
    });
  }
};
