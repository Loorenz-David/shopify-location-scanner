import { apiClient } from "../../../core/api-client";
export async function setShopifyMetafieldOptionsApi(payload) {
    return apiClient.put("/shopify/metafields/options", payload, { requiresAuth: true });
}
