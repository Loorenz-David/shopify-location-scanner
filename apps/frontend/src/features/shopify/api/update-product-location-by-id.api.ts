import { apiClient } from "../../../core/api-client";
import type {
  ShopifyProductResponseDto,
  UpdateProductLocationRequestDto,
} from "../types/shopify.dto";

export async function updateProductLocationByIdApi(
  productId: string,
  payload: UpdateProductLocationRequestDto,
): Promise<ShopifyProductResponseDto> {
  const encodedProductId = encodeURIComponent(productId);
  return apiClient.patch<
    ShopifyProductResponseDto,
    UpdateProductLocationRequestDto
  >(`/shopify/products/${encodedProductId}/location`, payload, {
    requiresAuth: true,
  });
}
