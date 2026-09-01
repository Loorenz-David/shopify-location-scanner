import { apiClient } from "../../../core/api-client";
import type {
  StockReportEntryDto,
  StockReportResponseDto,
} from "../types/stock.dto";
import { getStockReportMock } from "./mocks/get-stock-report.mock";
import { resolveStockApiMode } from "./stock-api-mode";

export async function getStockReport(): Promise<StockReportEntryDto[]> {
  if (resolveStockApiMode() === "mock") {
    return getStockReportMock();
  }

  const response = await apiClient.get<{ data: StockReportResponseDto }>(
    "/stock/report",
    { requiresAuth: true },
  );
  return response.data.entries;
}
