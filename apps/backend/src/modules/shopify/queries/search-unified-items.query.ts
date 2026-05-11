import { scanHistoryRepository } from "../../scanner/repositories/scan-history.repository.js";
import { searchProductsBySkuQuery } from "./search-products-by-sku.query.js";
import type { UnifiedItemSearchResultDto } from "../contracts/shopify.contract.js";
import { normalizeScanValue } from "../../../shared/utils/scan-value-normalizer.js";
import { logger } from "../../../shared/logging/logger.js";

const toPropertiesObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

export const searchUnifiedItemsQuery = async (input: {
  shopId: string;
  value: string;
  limit?: number;
}): Promise<UnifiedItemSearchResultDto[]> => {
  const limit = input.limit ?? 10;
  const { value, type } = normalizeScanValue(input.value);

  logger.info("Scanner item lookup started", {
    shopId: input.shopId,
    rawValue: input.value,
    normalizedValue: value,
    normalizedType: type,
    limit,
  });

  // ── Step 1: ScanHistory-first lookup ────────────────────────────────────
  const historyRecords = await scanHistoryRepository.findBySkuOrBarcode({
    shopId: input.shopId,
    value,
    limit,
  });
  const resolvedHistoryRecords =
    type === "url-handle"
      ? historyRecords.filter((record) => {
          const normalizedValue = value.trim().toLowerCase();
          const sku = record.itemSku?.trim().toLowerCase() ?? "";
          const barcode = record.itemBarcode?.trim().toLowerCase() ?? "";
          return sku === normalizedValue || barcode === normalizedValue;
        })
      : historyRecords;

  logger.info("Scanner item lookup ScanHistory results", {
    shopId: input.shopId,
    normalizedValue: value,
    normalizedType: type,
    count: resolvedHistoryRecords.length,
    candidateCount: historyRecords.length,
    records: historyRecords.map((record) => ({
      id: record.id,
      productId: record.productId,
      sku: record.itemSku,
      barcode: record.itemBarcode,
      title: record.itemTitle,
      currentPosition: record.latestLocation,
    })),
  });

  if (resolvedHistoryRecords.length > 0) {
    logger.info("Scanner item lookup resolved from ScanHistory", {
      shopId: input.shopId,
      normalizedValue: value,
      normalizedType: type,
      count: resolvedHistoryRecords.length,
      productIds: resolvedHistoryRecords.map((record) => record.productId),
    });

    return resolvedHistoryRecords.map((record) => ({
      productId: record.productId,
      title: record.itemTitle,
      imageUrl: record.itemImageUrl ?? null,
      itemCategory: record.itemCategory ?? null,
      sku: record.itemSku ?? "",
      barcode: record.itemBarcode ?? null,
      quantity: record.quantity ?? 1,
      properties: toPropertiesObject(record.properties),
      id: record.id,
      isSold: record.isSold,
      intention: record.intention ?? null,
      fixItem: record.fixItem ?? false,
      isItemFixed: record.isItemFixed,
      currentPosition: record.latestLocation ?? null,
      logisticsCompletedAt: record.logisticsCompletedAt
        ? record.logisticsCompletedAt.toISOString()
        : null,
    }));
  }

  // ── Step 2: Shopify GraphQL fallback ────────────────────────────────────
  const shopifyItems = await searchProductsBySkuQuery({
    shopId: input.shopId,
    sku: value,
    type,
  });

  logger.info("Scanner item lookup Shopify fallback results", {
    shopId: input.shopId,
    normalizedValue: value,
    normalizedType: type,
    count: shopifyItems.length,
    records: shopifyItems.map((item) => ({
      productId: item.productId,
      sku: item.sku,
      barcode: item.barcode,
      title: item.title,
    })),
  });

  if (shopifyItems.length === 0) return [];

  // Re-query ScanHistory by productId so items found via handle/art-number
  // get their correct scan history data (location, isSold, etc.)
  const historyByProductId = await scanHistoryRepository.findManyByProductIds({
    shopId: input.shopId,
    productIds: shopifyItems.map((item) => item.productId),
  });

  return shopifyItems.map((item) => {
    const history = historyByProductId.get(item.productId);
    return {
      productId: item.productId,
      title: history?.itemTitle ?? item.title,
      imageUrl: history?.itemImageUrl ?? item.imageUrl ?? null,
      itemCategory: history?.itemCategory ?? item.itemCategory ?? null,
      sku: history?.itemSku ?? item.sku,
      barcode: history?.itemBarcode ?? item.barcode ?? null,
      quantity: history?.quantity ?? item.quantity,
      properties: toPropertiesObject(history?.properties),
      id: history?.id ?? "",
      isSold: history?.isSold ?? false,
      intention: history?.intention ?? null,
      fixItem: history?.fixItem ?? false,
      isItemFixed: history?.isItemFixed ?? false,
      currentPosition: history?.latestLocation ?? null,
      logisticsCompletedAt: history?.logisticsCompletedAt
        ? history.logisticsCompletedAt.toISOString()
        : null,
    };
  });
};
