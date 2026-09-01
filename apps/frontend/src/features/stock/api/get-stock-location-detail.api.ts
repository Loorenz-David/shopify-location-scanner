import { apiClient } from "../../../core/api-client";
import type { LocationStockDto } from "../types/stock.dto";
import { getStockLocationDetailMock } from "./mocks/get-stock-location-detail.mock";
import { resolveStockApiMode } from "./stock-api-mode";

export async function getStockLocationDetail(
  location: string,
): Promise<LocationStockDto[]> {
  if (resolveStockApiMode() === "mock") {
    return getStockLocationDetailMock(location);
  }

  const encodedLocation = encodeURIComponent(location);
  const response = await apiClient.get<{ data: LocationStockDto[] }>(
    `/stock/locations/${encodedLocation}`,
    { requiresAuth: true },
  );
  return response.data;
}
