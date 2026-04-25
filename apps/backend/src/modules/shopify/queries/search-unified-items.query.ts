import { scanHistoryRepository } from "../../scanner/repositories/scan-history.repository.js";
import { searchProductsBySkuQuery } from "./search-products-by-sku.query.js";
import type { UnifiedItemSearchResultDto } from "../contracts/shopify.contract.js";

export const searchUnifiedItemsQuery = async (input: {
  shopId: string;
  value: string;
  limit?: number;
}): Promise<UnifiedItemSearchResultDto[]> => {
  const limit = input.limit ?? 10;

  // ── Step 1: ScanHistory-first lookup ────────────────────────────────────
  const historyRecords = await scanHistoryRepository.findBySkuOrBarcode({
    shopId: input.shopId,
    value: input.value,
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
    sku: input.value,
  });

  return shopifyItems.map((item) => ({
    productId: item.productId,
    title: item.title,
    imageUrl: item.imageUrl ?? null,
    sku: item.sku,
    barcode: item.barcode ?? null,
    id: "",
    isSold: false,
    intention: null,
    fixItem: false,
    isItemFixed: false,
    currentPosition: null,
  }));
};
