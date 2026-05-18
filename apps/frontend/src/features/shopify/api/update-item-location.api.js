import { apiClient } from "../../../core/api-client";
export async function updateItemLocationApi(payload) {
    return apiClient.patch("/shopify/items/location", payload, { requiresAuth: true });
}
