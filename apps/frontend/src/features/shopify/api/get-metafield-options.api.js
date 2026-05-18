import { apiClient } from "../../../core/api-client";
export async function getShopifyMetafieldOptionsApi() {
    return apiClient.get("/shopify/metafields/options", {
        requiresAuth: true,
    });
}
