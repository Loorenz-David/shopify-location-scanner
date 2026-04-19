import { logger } from "../../../shared/logging/logger.js";
import type { ProductLocationSnapshot } from "../domain/shopify-shop.js";
import { shopifyAdminApi } from "../integrations/shopify-admin-api.integration.js";
import { shopRepository } from "../repositories/shop.repository.js";

export const loadProductSnapshotsForOrderService = async (input: {
  shopId: string;
  shopDomain: string;
  productIds: string[];
}): Promise<Map<string, ProductLocationSnapshot>> => {
  const uniqueProductIds = [...new Set(input.productIds)];
  const snapshots = new Map<string, ProductLocationSnapshot>();

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
      });

      snapshots.set(productId, product);
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
