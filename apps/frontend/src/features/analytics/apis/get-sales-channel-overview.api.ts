import { apiClient } from "../../../core/api-client";
import type { SalesChannelOverviewItem } from "../types/analytics.types";

export async function getSalesChannelOverviewApi(
  from: string,
  to: string,
): Promise<SalesChannelOverviewItem[]> {
  const response = await apiClient.get<{ data: SalesChannelOverviewItem[] }>(
    `/stats/channels?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { requiresAuth: true },
  );

  return response.data;
}
