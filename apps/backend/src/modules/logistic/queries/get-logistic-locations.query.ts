import { logisticLocationRepository } from "../repositories/logistic-location.repository.js";
import type { LogisticLocationDto } from "../contracts/logistic.contract.js";

export const getLogisticLocationsQuery = async (input: {
  shopId: string;
}): Promise<LogisticLocationDto[]> => {
  return logisticLocationRepository.findByShop({ shopId: input.shopId });
};
