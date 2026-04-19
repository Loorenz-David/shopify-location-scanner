import { apiClient } from "../../../core/api-client";
import type { StoreZone } from "../types/analytics.types";

export async function listZonesApi(params?: {
  floorPlanId?: string;
}): Promise<StoreZone[]> {
  const query = params?.floorPlanId
    ? `?floorPlanId=${encodeURIComponent(params.floorPlanId)}`
    : "";
  const response = await apiClient.get<{ data: StoreZone[] }>(`/zones${query}`, {
    requiresAuth: true,
  });

  return response.data;
}
