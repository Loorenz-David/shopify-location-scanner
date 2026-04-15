import { apiClient } from "../../../core/api-client";
import type { GetLogisticLocationsResponseDto } from "../types/logistic-locations.dto";

export async function getLogisticLocationsApi(
  q?: string,
): Promise<GetLogisticLocationsResponseDto> {
  const params = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  return apiClient.get<GetLogisticLocationsResponseDto>(
    `/logistic/get-location${params}`,
    { requiresAuth: true },
  );
}
