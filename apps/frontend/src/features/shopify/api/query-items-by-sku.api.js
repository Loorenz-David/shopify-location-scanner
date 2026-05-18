import { apiClient } from "../../../core/api-client";
export async function queryShopifyItemsBySkuApi(sku) {
    const params = new URLSearchParams({ sku });
    return apiClient.get(`/shopify/items/by-sku?${params.toString()}`, {
        requiresAuth: true,
    });
}
