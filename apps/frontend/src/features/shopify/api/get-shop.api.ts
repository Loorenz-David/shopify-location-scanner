import { apiClient } from "../../../core/api-client";
import type { ShopifyLinkedShopResponseDto } from "../types/shopify.dto";

export async function getShopApi(): Promise<ShopifyLinkedShopResponseDto> {
  return apiClient.get<ShopifyLinkedShopResponseDto>("/shopify/shop", {
    requiresAuth: true,
  });
}
