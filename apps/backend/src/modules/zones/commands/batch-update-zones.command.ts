import type { BatchUpdateZonesInput } from "../contracts/zone.contract.js";
import type { StoreZone } from "../domain/zone.js";
import { zoneRepository } from "../repositories/zone.repository.js";

export const batchUpdateZonesCommand = async (
  shopId: string,
  input: BatchUpdateZonesInput,
): Promise<StoreZone[]> => {
  return zoneRepository.batchUpdate(shopId, input);
};
