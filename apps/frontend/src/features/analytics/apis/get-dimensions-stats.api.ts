import { apiClient } from "../../../core/api-client";
import type { DimensionsStats } from "../types/analytics.types";

export async function getDimensionsStatsApi(
  from: string,
  to: string,
): Promise<DimensionsStats> {
  const response = await apiClient.get<{ data: DimensionsStats }>(
    `/stats/dimensions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { requiresAuth: true },
  );

  return response.data;
}
