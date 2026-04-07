import { apiClient } from "../../../core/api-client";
import type { ShopifyUnlinkResponseDto } from "../types/shopify.dto";

export async function unlinkShopApi(): Promise<ShopifyUnlinkResponseDto> {
  return apiClient.delete<ShopifyUnlinkResponseDto>(
    "/shopify/shop",
    undefined,
    {
      requiresAuth: true,
    },
  );
}
