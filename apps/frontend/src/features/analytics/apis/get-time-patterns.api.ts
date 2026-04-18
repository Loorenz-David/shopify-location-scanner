import { apiClient } from "../../../core/api-client";
import type { SalesChannel, TimePatterns } from "../types/analytics.types";

export interface GetTimePatternsOptions {
  from: string;
  to: string;
  salesChannel?: SalesChannel;
  latestLocation?: string;
  itemCategory?: string;
}

export async function getTimePatternsApi(
  opts: GetTimePatternsOptions,
): Promise<TimePatterns> {
  const params = new URLSearchParams({ from: opts.from, to: opts.to });

  if (opts.salesChannel) params.set("salesChannel", opts.salesChannel);
  if (opts.latestLocation) params.set("latestLocation", opts.latestLocation);
  if (opts.itemCategory) params.set("itemCategory", opts.itemCategory);

  const response = await apiClient.get<{ data: TimePatterns }>(
    `/stats/time-patterns?${params.toString()}`,
    { requiresAuth: true },
  );

  return response.data;
}
