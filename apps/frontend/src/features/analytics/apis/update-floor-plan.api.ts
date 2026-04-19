import { apiClient } from "../../../core/api-client";
import type { FloorPlan, UpdateFloorPlanInput } from "../types/analytics.types";

export async function updateFloorPlanApi(
  id: string,
  input: UpdateFloorPlanInput,
): Promise<FloorPlan> {
  const response = await apiClient.patch<{ data: FloorPlan }, UpdateFloorPlanInput>(
    `/floor-plans/${id}`,
    input,
    { requiresAuth: true },
  );

  return response.data;
}
