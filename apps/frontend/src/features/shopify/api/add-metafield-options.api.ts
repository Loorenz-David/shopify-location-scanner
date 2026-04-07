import { apiClient } from "../../../core/api-client";
import type {
  SetShopifyMetafieldOptionsRequestDto,
  ShopifyMetafieldResponseDto,
} from "../types/shopify.dto";

export async function addShopifyMetafieldOptionsApi(
  payload: SetShopifyMetafieldOptionsRequestDto,
): Promise<ShopifyMetafieldResponseDto> {
  return apiClient.post<
    ShopifyMetafieldResponseDto,
    SetShopifyMetafieldOptionsRequestDto
  >("/shopify/metafields/options", payload, { requiresAuth: true });
}
