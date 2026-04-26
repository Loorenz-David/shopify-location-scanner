import { scanHistoryRepository } from "../../scanner/repositories/scan-history.repository.js";
import { searchProductsBySkuQuery } from "./search-products-by-sku.query.js";
import type { UnifiedItemSearchResultDto } from "../contracts/shopify.contract.js";
import { normalizeScanValue } from "../../../shared/utils/scan-value-normalizer.js";

export const searchUnifiedItemsQuery = async (input: {
  shopId: string;
  value: string;
  limit?: number;
}): Promise<UnifiedItemSearchResultDto[]> => {
  const limit = input.limit ?? 10;
  const { value, type } = normalizeScanValue(input.value);

  // ── Step 1: ScanHistory-first lookup ────────────────────────────────────
  const historyRecords = await scanHistoryRepository.findBySkuOrBarcode({
    shopId: input.shopId,
    value,
    limit,
  });

  if (historyRecords.length > 0) {
    return historyRecords.map((record) => ({
      productId: record.productId,
      title: record.itemTitle,
      imageUrl: record.itemImageUrl ?? null,
      sku: record.itemSku ?? "",
      barcode: record.itemBarcode ?? null,
      id: record.id,
      isSold: record.isSold,
      intention: record.intention ?? null,
      fixItem: record.fixItem ?? false,
      isItemFixed: record.isItemFixed,
      currentPosition: record.latestLocation ?? null,
    }));
  }

  // ── Step 2: Shopify GraphQL fallback ────────────────────────────────────
  const shopifyItems = await searchProductsBySkuQuery({
    shopId: input.shopId,
    sku: value,
    type,
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
      sku: history?.itemSku ?? item.sku,
      barcode: history?.itemBarcode ?? item.barcode ?? null,
      id: history?.id ?? "",
      isSold: history?.isSold ?? false,
      intention: history?.intention ?? null,
      fixItem: history?.fixItem ?? false,
      isItemFixed: history?.isItemFixed ?? false,
      currentPosition: history?.latestLocation ?? null,
    };
  });
};
