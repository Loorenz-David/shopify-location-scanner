import { apiClient } from "../../../core/api-client";
import { buildStatsItemsQuery } from "../domain/build-stats-items-query.domain";
import type {
  StatsItemsPage,
  StatsItemsQuery,
} from "../types/stats-items.types";

export async function getStatsItemsApi(
  query: StatsItemsQuery,
): Promise<StatsItemsPage> {
  const params = buildStatsItemsQuery(query);
  const qs = params.toString();
  const endpoint = qs ? `/stats/items?${qs}` : "/stats/items";

  const response = await apiClient.get<{ data: StatsItemsPage }>(endpoint, {
    requiresAuth: true,
  });

  return response.data;
}
