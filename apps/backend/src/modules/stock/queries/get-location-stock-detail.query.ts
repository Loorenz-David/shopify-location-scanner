import { locationStockRepository } from "../repositories/location-stock.repository.js";
import type { LocationStock } from "../contracts/stock.contract.js";

export const getLocationStockDetailQuery = async (
  shopId: string,
  location: string,
): Promise<LocationStock[]> => {
  const configurations = await locationStockRepository.listByShop(shopId);

  return configurations
    .filter((configuration) => configuration.location === location)
    .sort((left, right) => {
      const createdAtDifference =
        left.createdAt.getTime() - right.createdAt.getTime();
      return createdAtDifference !== 0
        ? createdAtDifference
        : left.id < right.id
          ? -1
          : left.id > right.id
            ? 1
            : 0;
    });
};
