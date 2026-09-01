import { deleteMockConfiguration, __resetMockState } from "./mock-state";

export function deleteStockConfigurationMock(id: string): void {
  deleteMockConfiguration(id);
}

export { __resetMockState };
