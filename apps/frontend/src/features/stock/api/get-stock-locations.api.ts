import { apiClient } from "../../../core/api-client";
import type { StockLocationSummaryDto } from "../types/stock.dto";
import { getStockLocationsMock } from "./mocks/get-stock-locations.mock";
import { resolveStockApiMode } from "./stock-api-mode";

export async function getStockLocations(): Promise<StockLocationSummaryDto[]> {
  if (resolveStockApiMode() === "mock") {
    return getStockLocationsMock();
  }

  const response = await apiClient.get<{ data: StockLocationSummaryDto[] }>(
    "/stock/locations",
    { requiresAuth: true },
  );
  return response.data;
}
