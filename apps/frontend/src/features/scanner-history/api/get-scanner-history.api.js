import { apiClient } from "../../../core/api-client";
export async function getScannerHistoryApi(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) {
        queryParams.set("page", String(params.page));
    }
    if (params.query?.trim()) {
        queryParams.set("q", params.query.trim());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString
        ? `/scanner/history?${queryString}`
        : "/scanner/history";
    return apiClient.get(endpoint, {
        requiresAuth: true,
    });
}
