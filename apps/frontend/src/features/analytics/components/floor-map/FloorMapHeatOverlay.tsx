import type { ZoneOverviewItem } from "../../types/analytics.types";

export function getZoneHeatColor(
  location: string,
  zonesOverview: ZoneOverviewItem[],
): string {
  const zoneOverview = zonesOverview.find((zone) => zone.location === location);
  if (!zoneOverview || zoneOverview.itemsSold === 0) {
    return "#94a3b8";
  }

  const maxItemsSold = Math.max(
    ...zonesOverview.map((zone) => zone.itemsSold),
    0,
  );

  if (maxItemsSold <= 0) {
    return "#94a3b8";
  }

  const ratio = zoneOverview.itemsSold / maxItemsSold;

  if (ratio >= 0.75) {
    return "#22c55e";
  }

  if (ratio >= 0.5) {
    return "#84cc16";
  }

  if (ratio >= 0.25) {
    return "#f59e0b";
  }

  return "#ef4444";
}
