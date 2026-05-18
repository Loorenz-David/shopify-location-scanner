import { apiClient } from "../../../core/api-client";
export async function getTimePatternsApi(opts) {
    const params = new URLSearchParams({ from: opts.from, to: opts.to });
    if (opts.salesChannel)
        params.set("salesChannel", opts.salesChannel);
    if (opts.latestLocation)
        params.set("latestLocation", opts.latestLocation);
    if (opts.itemCategory)
        params.set("itemCategory", opts.itemCategory);
    const response = await apiClient.get(`/stats/time-patterns?${params.toString()}`, { requiresAuth: true });
    return response.data;
}
