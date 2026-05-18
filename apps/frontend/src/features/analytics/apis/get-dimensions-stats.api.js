import { apiClient } from "../../../core/api-client";
export async function getDimensionsStatsApi(from, to) {
    const response = await apiClient.get(`/stats/dimensions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { requiresAuth: true });
    return response.data;
}
