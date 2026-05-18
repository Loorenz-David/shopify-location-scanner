import { apiClient } from "../../../core/api-client";
export async function getZonesOverviewApi(from, to) {
    const response = await apiClient.get(`/stats/zones?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { requiresAuth: true });
    return response.data;
}
