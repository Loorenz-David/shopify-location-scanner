import { apiClient } from "../../../core/api-client";
import type { FloorPlan } from "../types/analytics.types";

// No caller in Phase 1 — available for future single-plan detail screens.
export async function getFloorPlanApi(id: string): Promise<FloorPlan> {
  const response = await apiClient.get<{ data: FloorPlan }>(
    `/floor-plans/${id}`,
    { requiresAuth: true },
  );

  return response.data;
}
