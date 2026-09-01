import { getMockConfigurations, __resetMockState } from "./mock-state";

export function getStockLocationDetailMock(location: string) {
  return getMockConfigurations().filter(
    (configuration) => configuration.location === location,
  );
}

export { __resetMockState };
