import type { StoreZone } from "../domain/zone.js";
import { zoneRepository } from "../repositories/zone.repository.js";

export const getZonesQuery = async (
  shopId: string,
  floorPlanId?: string | null,
): Promise<StoreZone[]> => {
  return zoneRepository.list(shopId, floorPlanId);
};
