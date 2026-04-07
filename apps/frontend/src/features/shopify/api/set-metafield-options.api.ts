import { apiClient } from "../../../core/api-client";
import type {
  SetShopifyMetafieldOptionsRequestDto,
  ShopifyMetafieldResponseDto,
} from "../types/shopify.dto";

export async function setShopifyMetafieldOptionsApi(
  payload: SetShopifyMetafieldOptionsRequestDto,
): Promise<ShopifyMetafieldResponseDto> {
  return apiClient.put<
    ShopifyMetafieldResponseDto,
    SetShopifyMetafieldOptionsRequestDto
  >("/shopify/metafields/options", payload, { requiresAuth: true });
}
