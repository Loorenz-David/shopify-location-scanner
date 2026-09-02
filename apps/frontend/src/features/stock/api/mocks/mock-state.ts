import { STOCK_STATES } from "../../domain/stock-states.domain";
import type {
  CreateStockConfigurationsRequestDto,
  LocationStockDto,
} from "../../types/stock.dto";
import { stockLocationDetailFixture } from "./get-stock-location-detail.fixture";

let stockConfigurations = structuredClone(stockLocationDetailFixture);
let nextMockId = 1;

export function getMockConfigurations(): LocationStockDto[] {
  return structuredClone(stockConfigurations);
}

export function createMockConfigurations(
  request: CreateStockConfigurationsRequestDto,
): LocationStockDto[] {
  const created = request.configurations.map((configuration) => {
    const now = "2026-09-01T00:00:00.000Z";
    return {
      id: `mock-stock-${nextMockId++}`,
      location: configuration.location,
      itemCategory: configuration.itemCategory,
      properties: configuration.properties ?? {},
      quantity: 12,
      instanceCount: 6,
      stockState: STOCK_STATES[2],
      thresholds: structuredClone(configuration.thresholds),
      createdAt: now,
      createdByUsername: "david",
      updatedAt: now,
      updatedByUsername: "david",
    } satisfies LocationStockDto;
  });

  stockConfigurations = [...stockConfigurations, ...created];
  return structuredClone(created);
}

export function updateMockConfiguration(
  id: string,
  patch: Partial<
    Pick<LocationStockDto, "location" | "itemCategory" | "properties">
  > & { thresholds?: LocationStockDto["thresholds"] },
): LocationStockDto {
  const index = stockConfigurations.findIndex((configuration) => configuration.id === id);
  if (index < 0) {
    throw new Error(`Mock stock configuration not found: ${id}`);
  }

  const existing = stockConfigurations[index]!;
  const updated: LocationStockDto = {
    ...existing,
    ...patch,
    thresholds: patch.thresholds ?? existing.thresholds,
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
  stockConfigurations[index] = updated;
  return structuredClone(updated);
}

export function deleteMockConfiguration(id: string): void {
  stockConfigurations = stockConfigurations.filter(
    (configuration) => configuration.id !== id,
  );
}

export function __resetMockState(): void {
  stockConfigurations = structuredClone(stockLocationDetailFixture);
  nextMockId = 1;
}
