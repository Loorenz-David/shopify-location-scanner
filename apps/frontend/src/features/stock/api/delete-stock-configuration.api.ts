import { apiClient } from "../../../core/api-client";
import { deleteStockConfigurationMock } from "./mocks/delete-stock-configuration.mock";
import { resolveStockApiMode } from "./stock-api-mode";

export async function deleteStockConfiguration(id: string): Promise<void> {
  if (resolveStockApiMode() === "mock") {
    deleteStockConfigurationMock(id);
    return;
  }

  await apiClient.delete<{ ok: boolean }>(
    `/stock/configurations/${encodeURIComponent(id)}`,
    undefined,
    { requiresAuth: true },
  );
}
