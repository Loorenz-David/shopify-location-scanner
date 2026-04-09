import { apiClient } from "../../../core/api-client";
import type { CategoryOverviewItem } from "../types/analytics.types";

export async function getCategoriesOverviewApi(
  from: string,
  to: string,
): Promise<CategoryOverviewItem[]> {
  const response = await apiClient.get<{ data: CategoryOverviewItem[] }>(
    `/stats/categories?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { requiresAuth: true },
  );

  return response.data;
}
