import { apiClient } from "../../../core/api-client";
import { buildStatsItemsQuery } from "../domain/build-stats-items-query.domain";
export async function getStatsItemsApi(query) {
    const params = buildStatsItemsQuery(query);
    const qs = params.toString();
    const endpoint = qs ? `/stats/items?${qs}` : "/stats/items";
    const response = await apiClient.get(endpoint, {
        requiresAuth: true,
    });
    return response.data;
}
