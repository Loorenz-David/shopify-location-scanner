import { logger } from "../../../shared/logging/logger.js";
import type { ResolvedProductSnapshot } from "../domain/shopify-shop.js";
import { itemPropertiesResolver } from "../../../shared/item-properties/item-properties-resolver.service.js";
import { shopifyAdminApi } from "../integrations/shopify-admin-api.integration.js";
import { shopRepository } from "../repositories/shop.repository.js";

export const loadProductSnapshotsForOrderService = async (input: {
  shopId: string;
  shopDomain: string;
  productIds: string[];
}): Promise<Map<string, ResolvedProductSnapshot>> => {
  const uniqueProductIds = [...new Set(input.productIds)];
  const snapshots = new Map<string, ResolvedProductSnapshot>();

  if (uniqueProductIds.length === 0) {
    return snapshots;
  }

  const shop = await shopRepository.findById(input.shopId);
  if (!shop?.accessToken) {
    logger.warn("Order product snapshot enrichment skipped: shop not linked", {
      shopId: input.shopId,
      shopDomain: input.shopDomain,
      productCount: uniqueProductIds.length,
    });
    return snapshots;
  }

  for (const productId of uniqueProductIds) {
    try {
      const product = await shopifyAdminApi.getProductWithLocation({
        shopDomain: shop.shopDomain,
        accessToken: shop.accessToken,
        productId,
        includeMetafieldProperties: true,
      });

      const resolvedProperties = await itemPropertiesResolver.resolve({
        metafieldProperties: product.metafieldProperties,
        articleNumber: product.barcode,
      });

      snapshots.set(productId, { ...product, resolvedProperties });
    } catch (error) {
      logger.warn("Failed to enrich order product snapshot", {
        shopId: input.shopId,
        shopDomain: input.shopDomain,
        productId,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return snapshots;
};
