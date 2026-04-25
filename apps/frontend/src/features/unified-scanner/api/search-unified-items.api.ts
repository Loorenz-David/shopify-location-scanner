import { apiClient } from "../../../core/api-client";
import { normalizeShopifyImageUrl } from "../../shopify/domain/shopify-image.domain";
import type {
  UnifiedItemSearchResponse,
  UnifiedItemSearchResult,
  UnifiedScannerItem,
} from "../types/unified-scanner.types";

function mapToUnifiedScannerItem(
  result: UnifiedItemSearchResult,
): UnifiedScannerItem {
  return {
    id: result.id,
    idType: "product_id",
    itemId: result.productId,
    sku: result.sku,
    imageUrl:
      normalizeShopifyImageUrl(result.imageUrl, {
        width: 120,
        height: 120,
      }) ?? undefined,
    title: result.title,
    currentPosition: result.currentPosition ?? undefined,
    isSold: result.isSold,
    intention: result.intention,
    fixItem: result.fixItem,
    isItemFixed: result.isItemFixed,
  };
}

export async function searchUnifiedItemsApi(
  query: string,
): Promise<UnifiedScannerItem[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  try {
    const params = new URLSearchParams({ sku: normalizedQuery });
    const response = await apiClient.get<UnifiedItemSearchResponse>(
      `/shopify/items/by-sku?${params.toString()}`,
      { requiresAuth: true },
    );

    return response.items.map(mapToUnifiedScannerItem);
  } catch {
    return [];
  }
}
