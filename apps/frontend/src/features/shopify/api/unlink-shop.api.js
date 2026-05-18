import { apiClient } from "../../../core/api-client";
export async function unlinkShopApi() {
    return apiClient.delete("/shopify/shop", undefined, {
        requiresAuth: true,
    });
}
