import type { StockReportDto } from "../contracts/stock.contract.js";
import { locationStockRepository } from "../repositories/location-stock.repository.js";

export const getStockReportQuery = async (
  shopId: string,
): Promise<StockReportDto> => {
  const configurations = await locationStockRepository.listByShop(shopId);

  return {
    entries: configurations.map((configuration) => {
      const normalThreshold = configuration.thresholds.find(
        ({ state }) => state === "normal_in_stock",
      );
      if (normalThreshold === undefined) {
        throw new Error(
          `Stock definition ${configuration.id} has no normal_in_stock threshold`,
        );
      }

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
        stockState: configuration.stockState,
        unitsToNormalThreshold: Math.max(
          0,
          normalThreshold.thresholdQuantity - configuration.quantity,
        ),
      };
    }),
  };
};
