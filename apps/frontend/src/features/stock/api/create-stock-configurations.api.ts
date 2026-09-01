import { apiClient } from "../../../core/api-client";
import type {
  CreateStockConfigurationsRequestDto,
  LocationStockDto,
} from "../types/stock.dto";
import { createStockConfigurationsMock } from "./mocks/create-stock-configurations.mock";
import { resolveStockApiMode } from "./stock-api-mode";

export async function createStockConfigurations(
  body: CreateStockConfigurationsRequestDto,
): Promise<LocationStockDto[]> {
  if (resolveStockApiMode() === "mock") {
    return createStockConfigurationsMock(body);
  }

  const response = await apiClient.post<
    { data: LocationStockDto[] },
    CreateStockConfigurationsRequestDto
  >("/stock/configurations", body, { requiresAuth: true });
  return response.data;
}
