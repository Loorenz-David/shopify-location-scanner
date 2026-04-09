import { apiClient } from "../../../core/api-client";
import type { ZoneOverviewItem } from "../types/analytics.types";

export async function getZonesOverviewApi(
  from: string,
  to: string,
): Promise<ZoneOverviewItem[]> {
  const response = await apiClient.get<{ data: ZoneOverviewItem[] }>(
    `/stats/zones?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { requiresAuth: true },
  );

  return response.data;
}
