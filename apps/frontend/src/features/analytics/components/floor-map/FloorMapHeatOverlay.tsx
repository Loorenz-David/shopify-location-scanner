import type { ZoneOverviewItem } from "../../types/analytics.types";

export type FloorMapMetric = "itemsSold" | "revenue";

export function getZoneHeatColor(
  location: string,
  zonesOverview: ZoneOverviewItem[],
  metric: FloorMapMetric = "itemsSold",
): string {
  const zoneOverview = zonesOverview.find((zone) => zone.location === location);
  const currentValue =
    metric === "revenue" ? zoneOverview?.revenue ?? 0 : zoneOverview?.itemsSold ?? 0;

  if (!zoneOverview || currentValue === 0) {
    return "#94a3b8";
  }

  const maxMetricValue = Math.max(
    ...zonesOverview.map((zone) =>
      metric === "revenue" ? zone.revenue : zone.itemsSold,
    ),
    0,
  );

  if (maxMetricValue <= 0) {
    return "#94a3b8";
  }

  const ratio = currentValue / maxMetricValue;

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
