import { apiClient } from "../../../core/api-client";
export async function getLogisticLocationsApi(q) {
    const params = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    return apiClient.get(`/logistic/get-location${params}`, { requiresAuth: true });
}
