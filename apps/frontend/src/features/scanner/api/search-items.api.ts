import { queryShopifyItemsBySkuApi } from "../../shopify/api/query-items-by-sku.api";
import { normalizeShopifyImageUrl } from "../../shopify/domain/shopify-image.domain";
import type { ScannerItem } from "../types/scanner.types";

export async function searchItemsBySkuApi(
  query: string,
): Promise<ScannerItem[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const response = await queryShopifyItemsBySkuApi(query.trim());

    return response.items.map((item) => ({
      id: item.productId,
      idType: "product_id",
      itemId: item.productId,
      sku: item.sku,
      imageUrl:
        normalizeShopifyImageUrl(item.imageUrl, {
          width: 120,
          height: 120,
        }) ?? undefined,
      title: item.title,
      currentPosition: undefined,
    }));
  } catch {
    return [];
  }
}
