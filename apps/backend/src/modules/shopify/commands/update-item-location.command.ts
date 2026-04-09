import { NotFoundError } from "../../../shared/errors/http-errors.js";
import type {
  ShopifyProductLocationDto,
  UpdateItemLocationInput,
} from "../contracts/shopify.contract.js";
import { shopifyAdminApi } from "../integrations/shopify-admin-api.integration.js";
import { shopRepository } from "../repositories/shop.repository.js";
import { scanHistoryRepository } from "../../scanner/repositories/scan-history.repository.js";
import { userRepository } from "../../auth/repositories/user.repository.js";
import type { ScanHistoryRecord } from "../../scanner/domain/scan-history.js";
import { logger } from "../../../shared/logging/logger.js";

export const updateItemLocationCommand = async (input: {
  shopId: string;
  userId: string;
  resolvedProductId: string;
  originalItemId: string;
  idType: "product_id" | "handle" | "sku" | "barcode";
  payload: UpdateItemLocationInput;
}): Promise<{
  product: ShopifyProductLocationDto & { previousLocation: string | null };
  historyItem: ScanHistoryRecord;
}> => {
  logger.info("Update item location command started", {
    shopId: input.shopId,
    userId: input.userId,
    resolvedProductId: input.resolvedProductId,
    originalItemId: input.originalItemId,
    idType: input.idType,
    requestedLocation: input.payload.location,
  });

  const shop = await shopRepository.findById(input.shopId);
  if (!shop || !shop.accessToken) {
    logger.warn("Update item location aborted: shop not linked", {
      shopId: input.shopId,
      userId: input.userId,
      resolvedProductId: input.resolvedProductId,
    });
    throw new NotFoundError("Linked Shopify store not found");
  }

  const before = await shopifyAdminApi.getProductWithLocation({
    shopDomain: shop.shopDomain,
    accessToken: shop.accessToken,
    productId: input.resolvedProductId,
  });

  logger.info("Fetched product location before update", {
    shopId: input.shopId,
    resolvedProductId: input.resolvedProductId,
    beforeLocation: before.location,
    requestedLocation: input.payload.location,
  });

  if (before.location !== input.payload.location) {
    logger.info("Shopify location mutation requested", {
      shopId: input.shopId,
      resolvedProductId: input.resolvedProductId,
      fromLocation: before.location,
      toLocation: input.payload.location,
    });

    await shopifyAdminApi.updateProductLocation({
      shopDomain: shop.shopDomain,
      accessToken: shop.accessToken,
      productId: input.resolvedProductId,
      location: input.payload.location,
    });
  } else {
    logger.info("Shopify location mutation skipped: location unchanged", {
      shopId: input.shopId,
      resolvedProductId: input.resolvedProductId,
      location: before.location,
    });
  }

  const after = await shopifyAdminApi.getProductWithLocation({
    shopDomain: shop.shopDomain,
    accessToken: shop.accessToken,
    productId: input.resolvedProductId,
  });

  logger.info("Fetched product location after update", {
    shopId: input.shopId,
    resolvedProductId: input.resolvedProductId,
    beforeLocation: before.location,
    afterLocation: after.location,
    requestedLocation: input.payload.location,
  });

  const user = await userRepository.findById(input.userId);

  const historyItem = await scanHistoryRepository.appendLocationEvent({
    shopId: shop.id,
    userId: input.userId,
    username: user?.username ?? "unknown",
    currentPrice: after.price,
    itemHeight: after.itemHeight,
    itemWidth: after.itemWidth,
    itemDepth: after.itemDepth,
    volume: after.volume,
    productId: input.resolvedProductId,
    itemCategory: after.itemCategory,
    itemSku: input.idType === "sku" ? input.originalItemId : after.sku,
    itemBarcode:
      input.idType === "barcode" ? input.originalItemId : after.barcode,
    itemImageUrl: after.imageUrl,
    itemType: input.idType,
    itemTitle: after.title,
    location: after.location ?? input.payload.location,
  });

  logger.info("Scan history append completed", {
    shopId: input.shopId,
    userId: input.userId,
    resolvedProductId: input.resolvedProductId,
    historyItemId: historyItem.id,
    finalLocation: after.location ?? input.payload.location,
  });

  return {
    product: {
      id: after.id,
      title: after.title,
      itemCategory: after.itemCategory,
      barcode: after.barcode,
      price: after.price,
      itemHeight: after.itemHeight,
      itemWidth: after.itemWidth,
      itemDepth: after.itemDepth,
      volume: after.volume,
      location: after.location,
      previousLocation: before.location,
      updatedAt: after.updatedAt,
    },
    historyItem,
  };
};
