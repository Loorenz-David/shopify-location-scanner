import { apiClient } from "../../../core/api-client";
import type { CreateStoreZoneInput, StoreZone } from "../types/analytics.types";

export async function createZoneApi(
  payload: CreateStoreZoneInput,
): Promise<StoreZone> {
  const response = await apiClient.post<{ data: StoreZone }, CreateStoreZoneInput>(
    "/zones",
    payload,
    { requiresAuth: true },
  );

  return response.data;
}
