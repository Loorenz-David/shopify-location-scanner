import { apiClient } from "../../../core/api-client";
import type { SmartInsight } from "../types/analytics.types";

export async function getSmartInsightsApi(
  from: string,
  to: string,
): Promise<SmartInsight[]> {
  const response = await apiClient.get<{ data: SmartInsight[] }>(
    `/stats/insights?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { requiresAuth: true },
  );

  return response.data;
}
