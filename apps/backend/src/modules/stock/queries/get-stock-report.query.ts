import type { StockReportDto } from "../contracts/stock.contract.js";
import { locationStockRepository } from "../repositories/location-stock.repository.js";

export const getStockReportQuery = async (
  shopId: string,
): Promise<StockReportDto> => {
  const configurations = await locationStockRepository.listByShop(shopId);

  return {
    entries: configurations.map((configuration) => ({
      location: configuration.location,
      itemCategory: configuration.itemCategory,
      properties: configuration.properties,
      mergeKey: `${configuration.itemCategory}|${configuration.propertiesCanonical}`,
      quantity: configuration.quantity,
      stockState: configuration.stockState,
    })),
  };
};
