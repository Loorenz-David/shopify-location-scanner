import { apiClient } from "../../../core/api-client";
import { buildApiQueryParams } from "../domain/logistic-tasks.domain";
import type { LogisticIntention, LogisticTaskFilters } from "../types/logistic-tasks.types";

export async function getLogisticIntentionCountsApi(
  filters: LogisticTaskFilters,
  q: string,
): Promise<{ counts: Partial<Record<LogisticIntention, number>> }> {
  const params = buildApiQueryParams(filters, q);
  const queryString = params.toString();
  return apiClient.get(
    `/logistic/items/intention-counts${queryString ? `?${queryString}` : ""}`,
    { requiresAuth: true },
  );
}
