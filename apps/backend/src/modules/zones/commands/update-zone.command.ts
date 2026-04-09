import type { UpdateZoneInput } from "../contracts/zone.contract.js";
import type { StoreZone } from "../domain/zone.js";
import { zoneRepository } from "../repositories/zone.repository.js";

export const updateZoneCommand = async (
  id: string,
  shopId: string,
  input: UpdateZoneInput,
): Promise<StoreZone> => {
  return zoneRepository.update(id, shopId, input);
};
