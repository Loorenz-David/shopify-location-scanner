import type { CreateZoneInput } from "../contracts/zone.contract.js";
import type { StoreZone } from "../domain/zone.js";
import { zoneRepository } from "../repositories/zone.repository.js";

export const createZoneCommand = async (
  shopId: string,
  input: CreateZoneInput,
): Promise<StoreZone> => {
  return zoneRepository.create(shopId, input);
};
