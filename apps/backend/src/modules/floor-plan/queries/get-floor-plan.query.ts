import type { FloorPlan } from "../domain/floor-plan.js";
import { floorPlanRepository } from "../repositories/floor-plan.repository.js";

export const getFloorPlanQuery = async (
  id: string,
  shopId: string,
): Promise<FloorPlan> => {
  return floorPlanRepository.findById(id, shopId);
};
