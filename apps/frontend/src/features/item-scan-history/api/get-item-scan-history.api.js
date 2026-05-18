import { apiClient } from "../../../core/api-client";
import { defaultItemScanHistoryFilters, normalizeItemScanHistoryFilters, } from "../domain/item-scan-history-filters.domain";
export async function getItemScanHistoryApi(params = {}) {
    const queryParams = new URLSearchParams();
    const page = params.page ?? 1;
    const trimmedQuery = params.query?.trim() ?? "";
    const filters = normalizeItemScanHistoryFilters(params.filters ?? defaultItemScanHistoryFilters);
    queryParams.set("page", String(page));
    if (trimmedQuery) {
        queryParams.set("q", trimmedQuery);
    }
    if (filters.selectedFields.length > 0) {
        queryParams.set("fields", JSON.stringify(filters.selectedFields));
    }
    if (filters.includeLocationHistory) {
        queryParams.set("includeLocationHistory", "true");
    }
    if (filters.status) {
        queryParams.set("status", filters.status);
    }
    if (filters.salesChannel) {
        queryParams.set("salesChannel", filters.salesChannel);
    }
    if (filters.from) {
        queryParams.set("from", filters.from);
    }
    if (filters.to) {
        queryParams.set("to", filters.to);
    }
    if (params.cursor) {
        queryParams.set("cursor", params.cursor);
    }
    return apiClient.get(`/scanner/history?${queryParams.toString()}`, {
        requiresAuth: true,
    });
}
