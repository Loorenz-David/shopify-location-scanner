import type { StockReportDto } from "../contracts/stock.contract.js";
import { locationStockRepository } from "../repositories/location-stock.repository.js";

export const getStockReportQuery = async (
  shopId: string,
): Promise<StockReportDto> => {
  const configurations = await locationStockRepository.listByShop(shopId);

  return {
    entries: configurations.map((configuration) => {
      // Restock target is the highest configured threshold; thresholds are
      // validated non-empty on write, so 0 only appears for corrupt rows.
      const restockTarget = configuration.thresholds.reduce(
        (highest, { thresholdQuantity }) => Math.max(highest, thresholdQuantity),
        0,
      );

      return {
        thresholds: configuration.thresholds.map(({ state, thresholdQuantity }) => ({
          state,
          thresholdQuantity,
        })),
        location: configuration.location,
        itemCategory: configuration.itemCategory,
        properties: configuration.properties,
        mergeKey: `${configuration.itemCategory}|${configuration.propertiesCanonical}`,
        quantity: configuration.quantity,
        instanceCount: configuration.instanceCount,
        stockState: configuration.stockState,
        // Item-based (P7): thresholds count ScanHistory rows, so the gap to the
        // restock target is measured in instances, not units.
        unitsToRestockTarget: Math.max(
          0,
          restockTarget - configuration.instanceCount,
        ),
      };
    }),
  };
};
