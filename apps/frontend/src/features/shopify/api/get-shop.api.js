import { apiClient } from "../../../core/api-client";
export async function getShopApi() {
    return apiClient.get("/shopify/shop", {
        requiresAuth: true,
    });
}
