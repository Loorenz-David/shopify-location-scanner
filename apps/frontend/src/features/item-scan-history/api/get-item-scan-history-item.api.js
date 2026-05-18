import { apiClient } from "../../../core/api-client";
function normalizeItemResponse(response) {
    if (!response) {
        return null;
    }
    if ("productId" in response) {
        return response;
    }
    return response.historyItem ?? response.item ?? response.history ?? null;
}
export async function getItemScanHistoryItemApi(productId) {
    const response = await apiClient.get(`/scanner/history/item?productId=${encodeURIComponent(productId)}`, {
        requiresAuth: true,
    });
    return normalizeItemResponse(response);
}
