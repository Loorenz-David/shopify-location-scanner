import type { StatsItemsQuery } from "../types/stats-items.types";

export function buildStatsItemsQuery(query: StatsItemsQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.page !== undefined && query.page > 1) {
    params.set("page", String(query.page));
  }
  if (query.from !== undefined) params.set("from", query.from);
  if (query.to !== undefined) params.set("to", query.to);
  if (query.isSold !== undefined) params.set("isSold", String(query.isSold));
  if (query.latestLocation !== undefined)
    params.set("latestLocation", query.latestLocation);
  if (query.itemCategory !== undefined)
    params.set("itemCategory", query.itemCategory);
  if (query.lastSoldChannel !== undefined)
    params.set("lastSoldChannel", query.lastSoldChannel);
  if (query.heightMin !== undefined)
    params.set("heightMin", String(query.heightMin));
  if (query.heightMax !== undefined)
    params.set("heightMax", String(query.heightMax));
  if (query.widthMin !== undefined)
    params.set("widthMin", String(query.widthMin));
  if (query.widthMax !== undefined)
    params.set("widthMax", String(query.widthMax));
  if (query.depthMin !== undefined)
    params.set("depthMin", String(query.depthMin));
  if (query.depthMax !== undefined)
    params.set("depthMax", String(query.depthMax));
  if (query.volumeLabel !== undefined)
    params.set("volumeLabel", query.volumeLabel);
  if (query.hourOfDay !== undefined)
    params.set("hourOfDay", String(query.hourOfDay));
  if (query.weekday !== undefined)
    params.set("weekday", String(query.weekday));
  if (query.sortBy !== undefined) params.set("sortBy", query.sortBy);
  if (query.sortDir !== undefined) params.set("sortDir", query.sortDir);
  if (query.groupByOrder === true) params.set("groupByOrder", "true");

  return params;
}
