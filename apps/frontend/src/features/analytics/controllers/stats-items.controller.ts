import { getStatsItemsApi } from "../apis/get-stats-items.api";
import type { StatsItemsQuery } from "../types/stats-items.types";

export type StatsItemsControllerResult =
  | {
      ok: true;
      items: import("../types/stats-items.types").StatsItem[];
      total: number;
      page: number;
    }
  | { ok: false; message: string };

export async function fetchStatsItemsController(
  query: StatsItemsQuery,
  page: number,
): Promise<StatsItemsControllerResult> {
  try {
    const result = await getStatsItemsApi({ ...query, page });
    return {
      ok: true,
      items: result.items,
      total: result.total,
      page: result.page,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load items.";
    return { ok: false, message };
  }
}
