import { apiClient } from "../../../core/api-client";
export async function getSalesChannelOverviewApi(from, to) {
    const response = await apiClient.get(`/stats/channels?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { requiresAuth: true });
    return response.data;
}
