import { apiClient } from "../../../core/api-client";
import type { ShopifyProductResponseDto } from "../types/shopify.dto";

export async function getShopifyProductByIdApi(
  productId: string,
): Promise<ShopifyProductResponseDto> {
  const encodedProductId = encodeURIComponent(productId);
  return apiClient.get<ShopifyProductResponseDto>(
    `/shopify/products/${encodedProductId}`,
    {
      requiresAuth: true,
    },
  );
}
