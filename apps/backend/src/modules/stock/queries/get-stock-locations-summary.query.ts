import { locationStockRepository } from "../repositories/location-stock.repository.js";

export type StockLocationSummary = {
  location: string;
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
    .map(([location, stockCount]) => ({ location, stockCount }))
    .sort((left, right) =>
      left.location < right.location ? -1 : left.location > right.location ? 1 : 0,
    );
};
