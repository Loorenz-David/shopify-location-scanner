import type { FloorPlan } from "../domain/floor-plan.js";
import { floorPlanRepository } from "../repositories/floor-plan.repository.js";

export const getFloorPlansQuery = async (
  shopId: string,
): Promise<FloorPlan[]> => {
  return floorPlanRepository.list(shopId);
};
