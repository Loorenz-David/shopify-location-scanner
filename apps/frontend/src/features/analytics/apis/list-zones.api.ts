import { apiClient } from "../../../core/api-client";
import type { StoreZone } from "../types/analytics.types";

export async function listZonesApi(): Promise<StoreZone[]> {
  const response = await apiClient.get<{ data: StoreZone[] }>("/zones", {
    requiresAuth: true,
  });

  return response.data;
}
