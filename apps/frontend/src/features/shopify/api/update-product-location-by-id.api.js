import { apiClient } from "../../../core/api-client";
export async function updateProductLocationByIdApi(productId, payload) {
    const encodedProductId = encodeURIComponent(productId);
    return apiClient.patch(`/shopify/products/${encodedProductId}/location`, payload, {
        requiresAuth: true,
    });
}
