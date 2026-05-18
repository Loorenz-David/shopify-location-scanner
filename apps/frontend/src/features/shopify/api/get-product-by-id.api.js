import { apiClient } from "../../../core/api-client";
export async function getShopifyProductByIdApi(productId) {
    const encodedProductId = encodeURIComponent(productId);
    return apiClient.get(`/shopify/products/${encodedProductId}`, {
        requiresAuth: true,
    });
}
