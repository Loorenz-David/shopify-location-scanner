import { apiClient } from "../../../core/api-client";
import type { BatchUpdateStoreZonesInput } from "../types/analytics.types";

export async function batchUpdateZonesApi(
  payload: BatchUpdateStoreZonesInput,
): Promise<void> {
  await apiClient.put<void, BatchUpdateStoreZonesInput>("/zones/batch", payload, {
    requiresAuth: true,
  });
}
