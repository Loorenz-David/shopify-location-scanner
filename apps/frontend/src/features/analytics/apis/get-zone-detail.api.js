import { apiClient } from "../../../core/api-client";
export async function getZoneDetailApi(location, from, to) {
    const encodedLocation = encodeURIComponent(location);
    const response = await apiClient.get(`/stats/zones/${encodedLocation}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { requiresAuth: true });
    return response.data;
}
