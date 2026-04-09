import { apiClient } from "../../../core/api-client";
import type { ZoneDetail } from "../types/analytics.types";

export async function getZoneDetailApi(
  location: string,
  from: string,
  to: string,
): Promise<ZoneDetail> {
  const encodedLocation = encodeURIComponent(location);
  const response = await apiClient.get<{ data: ZoneDetail }>(
    `/stats/zones/${encodedLocation}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { requiresAuth: true },
  );

  return response.data;
}
