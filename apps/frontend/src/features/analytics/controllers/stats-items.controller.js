import { getStatsItemsApi } from "../apis/get-stats-items.api";
export async function fetchStatsItemsController(query, page) {
    try {
        const result = await getStatsItemsApi({ ...query, page });
        return {
            ok: true,
            items: result.items,
            total: result.total,
            page: result.page,
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load items.";
        return { ok: false, message };
    }
}
