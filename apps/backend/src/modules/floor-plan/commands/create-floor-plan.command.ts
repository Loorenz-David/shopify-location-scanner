import type { CreateFloorPlanInput } from "../contracts/floor-plan.contract.js";
import type { FloorPlan } from "../domain/floor-plan.js";
import { floorPlanRepository } from "../repositories/floor-plan.repository.js";

export const createFloorPlanCommand = async (
  shopId: string,
  input: CreateFloorPlanInput,
): Promise<FloorPlan> => {
  return floorPlanRepository.create(shopId, input);
};
