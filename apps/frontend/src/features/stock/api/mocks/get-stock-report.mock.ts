import type { StockReportEntryDto } from "../../types/stock.dto";
import { stockReportFixture } from "./get-stock-report.fixture";
import { __resetMockState } from "./mock-state";

export function getStockReportMock(): StockReportEntryDto[] {
  return structuredClone(stockReportFixture);
}

export { __resetMockState };
