import { apiClient } from "../../../core/api-client";
export async function getOauthInstallUrlApi(payload) {
    return apiClient.post("/shopify/oauth/install", payload, { requiresAuth: true });
}
