import type { StockLocationSummaryDto } from "../../types/stock.dto";
import { getMockConfigurations, __resetMockState } from "./mock-state";

export function getStockLocationsMock(): StockLocationSummaryDto[] {
  const counts = new Map<string, number>();
  for (const configuration of getMockConfigurations()) {
    counts.set(configuration.location, (counts.get(configuration.location) ?? 0) + 1);
  }

  return [...counts.entries()].map(([location, stockCount]) => ({
    location,
    stockCount,
  }));
}

export { __resetMockState };
