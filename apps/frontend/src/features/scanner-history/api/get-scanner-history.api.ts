import { apiClient } from "../../../core/api-client";
import type { ScannerHistoryResponseDto } from "../types/scanner-history.dto";

interface GetScannerHistoryParams {
  page?: number;
  query?: string;
}

export async function getScannerHistoryApi(
  params: GetScannerHistoryParams = {},
): Promise<ScannerHistoryResponseDto> {
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

  return apiClient.get<ScannerHistoryResponseDto>(endpoint, {
    requiresAuth: true,
  });
}
