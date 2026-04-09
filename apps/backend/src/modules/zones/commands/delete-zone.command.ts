import { zoneRepository } from "../repositories/zone.repository.js";

export const deleteZoneCommand = async (
  id: string,
  shopId: string,
): Promise<void> => {
  await zoneRepository.delete(id, shopId);
};
