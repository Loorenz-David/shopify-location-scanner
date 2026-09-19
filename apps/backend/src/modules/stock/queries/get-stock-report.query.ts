import type { StockReportDto } from "../contracts/stock.contract.js";
import { isLocationPattern } from "../domain/location-pattern.js";
import { locationStockRepository } from "../repositories/location-stock.repository.js";
import { missingItems } from "../domain/restock.js";

export const getStockReportQuery = async (
  shopId: string,
): Promise<StockReportDto> => {
  const configurations = await locationStockRepository.listByShop(shopId);

  return {
    entries: configurations.map((configuration) => {
      return {
        thresholds: configuration.thresholds.map(({ state, thresholdQuantity }) => ({
          state,
          thresholdQuantity,
        })),
        location: configuration.location,
        isLocationPattern: isLocationPattern(configuration.location),
        itemCategory: configuration.itemCategory,
        properties: configuration.properties,
        mergeKey: `${configuration.itemCategory}|${configuration.propertiesCanonical}`,
        quantity: configuration.quantity,
        instanceCount: configuration.instanceCount,
        stockState: configuration.stockState,
        // Item-based (P7): thresholds count ScanHistory rows, so the gap to the
        // restock target is measured in instances, not units.
        unitsToRestockTarget: missingItems(configuration),
      };
    }),
  };
};
