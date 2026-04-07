import { apiClient } from "../../../core/api-client";
import type {
  ShopifyProductResponseDto,
  UpdateItemLocationRequestDto,
} from "../types/shopify.dto";

export async function updateItemLocationApi(
  payload: UpdateItemLocationRequestDto,
): Promise<ShopifyProductResponseDto> {
  return apiClient.patch<
    ShopifyProductResponseDto,
    UpdateItemLocationRequestDto
  >("/shopify/items/location", payload, { requiresAuth: true });
}
