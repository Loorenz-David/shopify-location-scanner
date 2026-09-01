import type { LocationStockDto } from "../../types/stock.dto";
import { updateMockConfiguration, __resetMockState } from "./mock-state";

export function updateStockConfigurationMock(
  id: string,
  patch: Partial<
    Pick<LocationStockDto, "location" | "itemCategory" | "properties">
  > & { thresholds?: LocationStockDto["thresholds"] },
): LocationStockDto {
  return updateMockConfiguration(id, patch);
}

export { __resetMockState };
