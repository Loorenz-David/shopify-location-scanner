import { apiClient } from "../../../core/api-client";
export async function deleteShopifyMetafieldOptionApi(optionValue) {
    const encodedOptionValue = encodeURIComponent(optionValue);
    return apiClient.delete(`/shopify/metafields/options/${encodedOptionValue}`, { requiresAuth: true });
}
