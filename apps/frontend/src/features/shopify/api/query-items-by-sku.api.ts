import { apiClient } from "../../../core/api-client";
import type { ShopifyItemsBySkuResponseDto } from "../types/shopify.dto";

export async function queryShopifyItemsBySkuApi(
  sku: string,
): Promise<ShopifyItemsBySkuResponseDto> {
  const params = new URLSearchParams({ sku });
  return apiClient.get<ShopifyItemsBySkuResponseDto>(
    `/shopify/items/by-sku?${params.toString()}`,
    {
      requiresAuth: true,
    },
  );
}
