import { queryShopifyItemsBySkuApi } from "../../shopify/api/query-items-by-sku.api";
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
      imageUrl: item.imageUrl,
      title: item.title,
      currentPosition: undefined,
    }));
  } catch {
    return [];
  }
}
