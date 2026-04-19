import { apiClient } from "../../../core/api-client";
import type {
  CreateFloorPlanInput,
  FloorPlan,
} from "../types/analytics.types";

export async function createFloorPlanApi(
  input: CreateFloorPlanInput,
): Promise<FloorPlan> {
  const response = await apiClient.post<
    { data: FloorPlan },
    CreateFloorPlanInput
  >("/floor-plans", input, {
    requiresAuth: true,
  });

  return response.data;
}
