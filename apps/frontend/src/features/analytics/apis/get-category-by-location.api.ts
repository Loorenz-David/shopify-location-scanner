import { apiClient } from "../../../core/api-client";
import type { CategoryLocationRow } from "../stores/analytics.store";

export async function getCategoryByLocationApi(
  category: string,
  from: string,
  to: string,
): Promise<CategoryLocationRow[]> {
  const encodedCategory = encodeURIComponent(category);
  const response = await apiClient.get<{ data: CategoryLocationRow[] }>(
    `/stats/categories/${encodedCategory}/locations?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { requiresAuth: true },
  );

  return response.data;
}
