import { apiClient } from "../../../core/api-client";
import type { ItemScanHistoryResponseDto } from "../types/item-scan-history.dto";

interface GetItemScanHistoryParams {
  page?: number;
  query?: string;
}

export async function getItemScanHistoryApi(
  params: GetItemScanHistoryParams = {},
): Promise<ItemScanHistoryResponseDto> {
  const queryParams = new URLSearchParams();
  const page = params.page ?? 1;
  const trimmedQuery = params.query?.trim() ?? "";

  queryParams.set("page", String(page));

  if (trimmedQuery) {
    queryParams.set("q", trimmedQuery);
  }

  return apiClient.get<ItemScanHistoryResponseDto>(
    `/scanner/history?${queryParams.toString()}`,
    {
      requiresAuth: true,
    },
  );
}
