import { apiClient } from "../../../core/api-client";
import {
  defaultItemScanHistoryFilters,
  normalizeItemScanHistoryFilters,
} from "../domain/item-scan-history-filters.domain";
import type { ItemScanHistoryFilters } from "../types/item-scan-history-filters.types";
import type { ItemScanHistoryResponseDto } from "../types/item-scan-history.dto";

interface GetItemScanHistoryParams {
  page?: number;
  query?: string;
  filters?: ItemScanHistoryFilters;
}

export async function getItemScanHistoryApi(
  params: GetItemScanHistoryParams = {},
): Promise<ItemScanHistoryResponseDto> {
  const queryParams = new URLSearchParams();
  const page = params.page ?? 1;
  const trimmedQuery = params.query?.trim() ?? "";
  const filters = normalizeItemScanHistoryFilters(
    params.filters ?? defaultItemScanHistoryFilters,
  );

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

  queryParams.set("status", filters.status);

  if (filters.from) {
    queryParams.set("from", filters.from);
  }

  if (filters.to) {
    queryParams.set("to", filters.to);
  }

  return apiClient.get<ItemScanHistoryResponseDto>(
    `/scanner/history?${queryParams.toString()}`,
    {
      requiresAuth: true,
    },
  );
}
