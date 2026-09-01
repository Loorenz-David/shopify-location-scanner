import { apiClient } from "../../../core/api-client";
import type { LocationStockDto, StockThresholdDto } from "../types/stock.dto";
import { updateStockConfigurationMock } from "./mocks/update-stock-configuration.mock";
import { resolveStockApiMode } from "./stock-api-mode";

type StockConfigurationPatch = Partial<
  Pick<LocationStockDto, "location" | "itemCategory" | "properties">
> & { thresholds?: StockThresholdDto[] };

export async function updateStockConfiguration(
  id: string,
  patch: StockConfigurationPatch,
): Promise<LocationStockDto> {
  if (resolveStockApiMode() === "mock") {
    return updateStockConfigurationMock(id, patch);
  }

  const response = await apiClient.patch<
    { data: LocationStockDto },
    StockConfigurationPatch
  >(`/stock/configurations/${encodeURIComponent(id)}`, patch, {
    requiresAuth: true,
  });
  return response.data;
}
