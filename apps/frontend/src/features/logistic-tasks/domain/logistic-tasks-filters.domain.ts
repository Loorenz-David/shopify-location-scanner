import type { LogisticTaskFilters } from "../types/logistic-tasks.types";

export function defaultLogisticTaskFilters(): LogisticTaskFilters {
  return {};
}

export function countActiveLogisticTaskFilters(
  filters: LogisticTaskFilters,
): number {
  return Object.values(filters).filter((v) => v !== undefined && v !== null)
    .length;
}

export function serializeFiltersForRequestKey(
  filters: LogisticTaskFilters,
): string {
  return JSON.stringify(filters);
}
