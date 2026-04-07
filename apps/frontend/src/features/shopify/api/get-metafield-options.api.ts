import { apiClient } from "../../../core/api-client";
import type { ShopifyMetafieldResponseDto } from "../types/shopify.dto";

export async function getShopifyMetafieldOptionsApi(): Promise<ShopifyMetafieldResponseDto> {
  return apiClient.get<ShopifyMetafieldResponseDto>(
    "/shopify/metafields/options",
    {
      requiresAuth: true,
    },
  );
}
