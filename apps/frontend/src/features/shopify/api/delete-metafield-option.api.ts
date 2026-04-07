import { apiClient } from "../../../core/api-client";
import type { ShopifyMetafieldResponseDto } from "../types/shopify.dto";

export async function deleteShopifyMetafieldOptionApi(
  optionValue: string,
): Promise<ShopifyMetafieldResponseDto> {
  const encodedOptionValue = encodeURIComponent(optionValue);
  return apiClient.delete<ShopifyMetafieldResponseDto>(
    `/shopify/metafields/options/${encodedOptionValue}`,
    { requiresAuth: true },
  );
}
