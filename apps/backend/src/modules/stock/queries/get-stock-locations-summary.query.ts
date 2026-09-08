import { locationStockRepository } from "../repositories/location-stock.repository.js";
import { isLocationPattern } from "../domain/location-pattern.js";

export type StockLocationSummary = {
  location: string;
  // A prefix definition ("LC%") groups into its own card, labelled as a block
  // rather than shown as a raw pattern string.
  isLocationPattern: boolean;
  stockCount: number;
};

export const getStockLocationsSummaryQuery = async (
  shopId: string,
): Promise<StockLocationSummary[]> => {
  const configurations = await locationStockRepository.listByShop(shopId);
  const counts = new Map<string, number>();

  for (const configuration of configurations) {
    counts.set(
      configuration.location,
      (counts.get(configuration.location) ?? 0) + 1,
    );
  }

  return [...counts.entries()]
    .map(([location, stockCount]) => ({
      location,
      isLocationPattern: isLocationPattern(location),
      stockCount,
    }))
    .sort((left, right) =>
      left.location < right.location ? -1 : left.location > right.location ? 1 : 0,
    );
};
