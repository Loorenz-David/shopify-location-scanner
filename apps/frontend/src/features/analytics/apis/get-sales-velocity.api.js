import { apiClient } from "../../../core/api-client";
export async function getSalesVelocityApi(from, to, salesChannel) {
    const channelParam = salesChannel
        ? `&salesChannel=${encodeURIComponent(salesChannel)}`
        : "";
    const response = await apiClient.get(`/stats/velocity?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${channelParam}`, { requiresAuth: true });
    return response.data;
}
