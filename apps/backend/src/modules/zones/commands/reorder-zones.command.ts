import { zoneRepository } from "../repositories/zone.repository.js";

export const reorderZonesCommand = async (
  shopId: string,
  updates: Array<{ id: string; sortOrder: number }>,
): Promise<void> => {
  await zoneRepository.reorder(shopId, updates);
};
