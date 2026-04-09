import { apiClient } from "../../../core/api-client";
import type { ReorderStoreZonesInput } from "../types/analytics.types";

export async function reorderZonesApi(
  payload: ReorderStoreZonesInput,
): Promise<void> {
  await apiClient.put<void, ReorderStoreZonesInput>("/zones/reorder", payload, {
    requiresAuth: true,
  });
}
