import { apiClient } from "../../../core/api-client";
export async function getBootstrapApi() {
    return apiClient.get("/bootstrap", {
        requiresAuth: true,
    });
}
