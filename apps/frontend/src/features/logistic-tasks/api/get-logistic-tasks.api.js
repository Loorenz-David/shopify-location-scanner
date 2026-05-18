import { apiClient } from "../../../core/api-client";
import { buildApiQueryParams } from "../domain/logistic-tasks.domain";
export async function getLogisticTasksApi(filters, ids, cursor, q) {
    const params = buildApiQueryParams(filters, q);
    if (ids && ids.length > 0) {
        params.set("ids", ids.join(","));
    }
    if (cursor) {
        params.set("cursor", cursor);
    }
    const queryString = params.toString();
    const endpoint = queryString
        ? `/logistic/items?${queryString}`
        : "/logistic/items";
    return apiClient.get(endpoint, {
        requiresAuth: true,
    });
}
