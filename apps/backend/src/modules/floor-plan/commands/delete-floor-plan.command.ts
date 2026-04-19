import { floorPlanRepository } from "../repositories/floor-plan.repository.js";

export const deleteFloorPlanCommand = async (
  id: string,
  shopId: string,
): Promise<void> => {
  return floorPlanRepository.delete(id, shopId);
};
