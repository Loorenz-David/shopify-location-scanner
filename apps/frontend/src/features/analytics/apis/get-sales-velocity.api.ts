import { apiClient } from "../../../core/api-client";
import type { SalesChannel, VelocityPoint } from "../types/analytics.types";

export async function getSalesVelocityApi(
  from: string,
  to: string,
  salesChannel?: SalesChannel,
): Promise<VelocityPoint[]> {
  const channelParam = salesChannel
    ? `&salesChannel=${encodeURIComponent(salesChannel)}`
    : "";
  const response = await apiClient.get<{ data: VelocityPoint[] }>(
    `/stats/velocity?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${channelParam}`,
    { requiresAuth: true },
  );

  return response.data;
}
