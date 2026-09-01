import { stockOptionsFixture } from "./get-stock-options.fixture";
import { __resetMockState } from "./mock-state";

export function getStockOptionsMock() {
  return structuredClone(stockOptionsFixture);
}

export { __resetMockState };
