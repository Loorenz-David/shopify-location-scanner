import { apiClient } from "../../../core/api-client";
import type { StockOptionsDto } from "../types/stock.dto";
import { getStockOptionsMock } from "./mocks/get-stock-options.mock";
import { resolveStockApiMode } from "./stock-api-mode";

export async function getStockOptions(): Promise<StockOptionsDto> {
  if (resolveStockApiMode() === "mock") {
    return getStockOptionsMock();
  }

  const response = await apiClient.get<{ data: StockOptionsDto }>(
    "/stock/options",
    { requiresAuth: true },
  );
  return response.data;
}
