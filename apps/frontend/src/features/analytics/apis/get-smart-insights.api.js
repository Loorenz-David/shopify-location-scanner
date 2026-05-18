import { apiClient } from "../../../core/api-client";
export async function getSmartInsightsApi(from, to) {
    const response = await apiClient.get(`/stats/insights?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { requiresAuth: true });
    return response.data;
}
