import { apiClient } from "../../../core/api-client";
import type { UpdateStoreZoneInput } from "../types/analytics.types";

export async function updateZoneApi(
  id: string,
  payload: UpdateStoreZoneInput,
): Promise<void> {
  const encodedId = encodeURIComponent(id);
  await apiClient.patch<void, UpdateStoreZoneInput>(`/zones/${encodedId}`, payload, {
    requiresAuth: true,
  });
}
