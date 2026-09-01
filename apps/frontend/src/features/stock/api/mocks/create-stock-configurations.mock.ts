import type {
  CreateStockConfigurationsRequestDto,
  LocationStockDto,
} from "../../types/stock.dto";
import { createMockConfigurations, __resetMockState } from "./mock-state";

export function createStockConfigurationsMock(
  request: CreateStockConfigurationsRequestDto,
): LocationStockDto[] {
  return createMockConfigurations(request);
}

export { __resetMockState };
