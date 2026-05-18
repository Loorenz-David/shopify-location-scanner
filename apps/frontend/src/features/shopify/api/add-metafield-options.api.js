import { apiClient } from "../../../core/api-client";
export async function addShopifyMetafieldOptionsApi(payload) {
    return apiClient.post("/shopify/metafields/options", payload, { requiresAuth: true });
}
