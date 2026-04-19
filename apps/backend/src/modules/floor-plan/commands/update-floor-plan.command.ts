import type { UpdateFloorPlanInput } from "../contracts/floor-plan.contract.js";
import type { FloorPlan } from "../domain/floor-plan.js";
import { floorPlanRepository } from "../repositories/floor-plan.repository.js";

export const updateFloorPlanCommand = async (
  id: string,
  shopId: string,
  input: UpdateFloorPlanInput,
): Promise<FloorPlan> => {
  return floorPlanRepository.update(id, shopId, input);
};
