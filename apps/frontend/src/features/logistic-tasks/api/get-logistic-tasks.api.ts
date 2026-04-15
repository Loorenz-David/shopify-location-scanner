import { apiClient } from "../../../core/api-client";
import { buildApiQueryParams } from "../domain/logistic-tasks.domain";
import type { GetLogisticTasksResponseDto } from "../types/logistic-tasks.dto";
import type { LogisticTaskFilters } from "../types/logistic-tasks.types";

export async function getLogisticTasksApi(
  filters: LogisticTaskFilters,
  ids?: string[],
): Promise<GetLogisticTasksResponseDto> {
  const params = buildApiQueryParams(filters);

  if (ids && ids.length > 0) {
    params.set("ids", ids.join(","));
  }

  const queryString = params.toString();
  const endpoint = queryString
    ? `/logistic/items?${queryString}`
    : "/logistic/items";

  return apiClient.get<GetLogisticTasksResponseDto>(endpoint, {
    requiresAuth: true,
  });
}
