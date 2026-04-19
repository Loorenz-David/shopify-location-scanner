import { apiClient } from "../../../core/api-client";
import type { FloorPlan } from "../types/analytics.types";

export async function listFloorPlansApi(): Promise<FloorPlan[]> {
  const response = await apiClient.get<{ data: FloorPlan[] }>("/floor-plans", {
    requiresAuth: true,
  });

  return response.data;
}
