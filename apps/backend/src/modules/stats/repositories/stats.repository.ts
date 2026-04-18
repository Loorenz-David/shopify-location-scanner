import { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/database/prisma-client.js";
import type {
  CategoryOverviewItem,
  DimensionsStats,
  DimensionBucket,
  SalesChannelOverviewItem,
  SmartInsight,
  TimePatternHourPoint,
  TimePatternWeekdayPoint,
  TimePatterns,
  VelocityPoint,
  ZoneDetail,
  ZoneLevelBreakdown,
  ZoneOverviewItem,
} from "../domain/stats.js";

// Matches "H1:2" — zone prefix + colon + numeric level only.
// Intentionally does NOT match sentinels like "SOLD_ORDER:abc123".
const LEVEL_LOCATION_RE = /^(.+):(\d+)$/;

const parseZonePrefix = (location: string): string => {
  const match = LEVEL_LOCATION_RE.exec(location);
  return match ? (match[1] as string) : location;
};

const isLevelLocation = (location: string): boolean =>
  LEVEL_LOCATION_RE.test(location);

type Bucket = {
  min: number;
  max: number | null;
  label: string;
};

const HEIGHT_BUCKETS: Bucket[] = [
  { min: 0, max: 40, label: "0–40 cm" },
  { min: 40, max: 80, label: "40–80 cm" },
  { min: 80, max: 120, label: "80–120 cm" },
  { min: 120, max: null, label: "120+ cm" },
];

const WIDTH_BUCKETS: Bucket[] = [
  { min: 0, max: 50, label: "0–50 cm" },
  { min: 50, max: 100, label: "50–100 cm" },
  { min: 100, max: null, label: "100+ cm" },
];

const VOLUME_BUCKETS: Bucket[] = [
  { min: 0, max: 50_000, label: "Small" },
  { min: 50_000, max: 200_000, label: "Medium" },
  { min: 200_000, max: null, label: "Large" },
];

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);
const prismaWithSalesChannelStats = prisma as typeof prisma & {
  salesChannelStatsDaily: typeof prisma.salesChannelStatsDaily;
};

const getKnownLocationsForShop = async (shopId: string): Promise<string[]> => {
  const rows = await prisma.scanHistoryEvent.findMany({
    where: {
      scanHistory: {
        shopId,
      },
    },
    select: {
      location: true,
    },
    distinct: ["location"],
  });

  return rows
    .map((row) => row.location.trim())
    .filter((location) => location.length > 0);
};

const bucketize = (
  items: Array<{ value: number | null; isSold: boolean }>,
  buckets: Bucket[],
): DimensionBucket[] => {
  return buckets.map((bucket) => {
    const inBucket = items.filter(
      (item) =>
        item.value !== null &&
        item.value >= bucket.min &&
        (bucket.max === null || item.value < bucket.max),
    );

    return {
      bucket:
        bucket.max === null ? `${bucket.min}+` : `${bucket.min}-${bucket.max}`,
      label: bucket.label,
      soldCount: inBucket.filter((item) => item.isSold).length,
      totalCount: inBucket.length,
    };
  });
};

export const getZonesOverview = async (
  shopId: string,
  from: Date,
  to: Date,
): Promise<ZoneOverviewItem[]> => {
  const locations = await getKnownLocationsForShop(shopId);
  if (locations.length === 0) return [];

  const rows = await prisma.locationStatsDaily.groupBy({
    by: ["location"],
    where: {
      date: { gte: from, lte: to },
      location: { in: locations },
    },
    _sum: {
      itemsSold: true,
      itemsReceived: true,
      totalTimeToSellSeconds: true,
      totalValuation: true,
    },
  });

  // Cluster raw location rows by zone prefix.
  // "H1:1" + "H1:2" + "H1:3" → zone "H1" with levelCount 3.
  // "H2" (no colon) → zone "H2" with levelCount 1.
  // Sentinels like "SOLD_ORDER:abc" are not matched by LEVEL_LOCATION_RE and stay as-is.
  type ZoneAccum = {
    itemsSold: number;
    itemsReceived: number;
    totalTimeToSellSeconds: number;
    totalValuation: number;
    rawLocations: Set<string>;
  };

  const zoneMap = new Map<string, ZoneAccum>();

  for (const row of rows) {
    const zone = parseZonePrefix(row.location);
    const acc = zoneMap.get(zone) ?? {
      itemsSold: 0,
      itemsReceived: 0,
      totalTimeToSellSeconds: 0,
      totalValuation: 0,
      rawLocations: new Set(),
    };
    acc.itemsSold += row._sum.itemsSold ?? 0;
    acc.itemsReceived += row._sum.itemsReceived ?? 0;
    acc.totalTimeToSellSeconds += row._sum.totalTimeToSellSeconds ?? 0;
    acc.totalValuation += row._sum.totalValuation ?? 0;
    acc.rawLocations.add(row.location);
    zoneMap.set(zone, acc);
  }

  return Array.from(zoneMap.entries())
    .map(([location, acc]) => ({
      location,
      itemsSold: acc.itemsSold,
      itemsReceived: acc.itemsReceived,
      revenue: acc.totalValuation,
      avgTimeToSellSeconds:
        acc.itemsSold > 0 ? acc.totalTimeToSellSeconds / acc.itemsSold : null,
      levelCount: acc.rawLocations.size,
    }))
    .sort((a, b) => b.itemsSold - a.itemsSold);
};

export const getZoneDetail = async (
  shopId: string,
  location: string, // "H1" → zone view (aggregates all H1:* levels); "H1:2" → specific level view
  from: Date,
  to: Date,
): Promise<Omit<ZoneDetail, "location">> => {
  const isLevel = isLevelLocation(location);
  const knownLocations = await getKnownLocationsForShop(shopId);

  // For a zone request ("H1") match exact + all levels ("H1:1", "H1:2", ...).
  // For a level request ("H1:2") match only that exact string.
  const matchingLocations = isLevel
    ? knownLocations.filter((l) => l === location)
    : knownLocations.filter(
        (l) => l === location || l.startsWith(`${location}:`),
      );

  const empty: Omit<ZoneDetail, "location"> = {
    isLevelView: isLevel,
    kpis: { itemsSold: 0, itemsReceived: 0, revenue: 0, avgTimeToSellSeconds: null },
    categories: [],
    dailySeries: [],
    levels: null,
  };

  if (matchingLocations.length === 0) return empty;

  const [daily, categories] = await Promise.all([
    prisma.locationStatsDaily.findMany({
      where: {
        location: { in: matchingLocations },
        date: { gte: from, lte: to },
      },
      orderBy: { date: "asc" },
    }),
    prisma.locationCategoryStatsDaily.groupBy({
      by: ["itemCategory"],
      where: {
        location: { in: matchingLocations },
        date: { gte: from, lte: to },
      },
      _sum: {
        itemsSold: true,
        totalRevenue: true,
        totalTimeToSellSeconds: true,
      },
      orderBy: { _sum: { itemsSold: "desc" } },
    }),
  ]);

  const totalSold = daily.reduce((s, r) => s + r.itemsSold, 0);
  const totalReceived = daily.reduce((s, r) => s + r.itemsReceived, 0);
  const totalRevenue = daily.reduce((s, r) => s + r.totalValuation, 0);
  const totalSeconds = daily.reduce((s, r) => s + r.totalTimeToSellSeconds, 0);

  // Aggregate daily series across all matching locations by date key.
  const dateMap = new Map<string, { itemsSold: number; revenue: number }>();
  for (const row of daily) {
    const key = toIsoDate(row.date);
    const acc = dateMap.get(key) ?? { itemsSold: 0, revenue: 0 };
    dateMap.set(key, {
      itemsSold: acc.itemsSold + row.itemsSold,
      revenue: acc.revenue + row.totalValuation,
    });
  }

  // Level breakdown — only for zone view with more than one matching location.
  let levels: ZoneLevelBreakdown[] | null = null;
  if (!isLevel && matchingLocations.length > 1) {
    type LevelAccum = { itemsSold: number; itemsReceived: number; revenue: number; totalSeconds: number };
    const levelMap = new Map<string, LevelAccum>();
    for (const row of daily) {
      const acc = levelMap.get(row.location) ?? { itemsSold: 0, itemsReceived: 0, revenue: 0, totalSeconds: 0 };
      levelMap.set(row.location, {
        itemsSold: acc.itemsSold + row.itemsSold,
        itemsReceived: acc.itemsReceived + row.itemsReceived,
        revenue: acc.revenue + row.totalValuation,
        totalSeconds: acc.totalSeconds + row.totalTimeToSellSeconds,
      });
    }
    levels = Array.from(levelMap.entries()).map(([level, acc]) => ({
      level,
      itemsSold: acc.itemsSold,
      itemsReceived: acc.itemsReceived,
      revenue: acc.revenue,
      avgTimeToSellSeconds: acc.itemsSold > 0 ? acc.totalSeconds / acc.itemsSold : null,
    }));
  }

  return {
    isLevelView: isLevel,
    kpis: {
      itemsSold: totalSold,
      itemsReceived: totalReceived,
      revenue: totalRevenue,
      avgTimeToSellSeconds: totalSold > 0 ? totalSeconds / totalSold : null,
    },
    categories: categories.map((cat) => {
      const itemsSold = cat._sum.itemsSold ?? 0;
      const catSeconds = cat._sum.totalTimeToSellSeconds ?? 0;
      return {
        category: cat.itemCategory,
        itemsSold,
        revenue: cat._sum.totalRevenue ?? 0,
        avgTimeToSellSeconds: itemsSold > 0 ? catSeconds / itemsSold : null,
      };
    }),
    dailySeries: Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data })),
    levels,
  };
};

export const getCategoryByLocation = async (
  shopId: string,
  category: string,
  from: Date,
  to: Date,
): Promise<{ location: string; itemsSold: number; revenue: number; avgTimeToSellSeconds: number | null }[]> => {
  const locations = await getKnownLocationsForShop(shopId);
  if (locations.length === 0) return [];

  const rows = await prisma.locationCategoryStatsDaily.groupBy({
    by: ["location"],
    where: {
      itemCategory: category,
      date: { gte: from, lte: to },
      location: { in: locations },
    },
    _sum: {
      itemsSold: true,
      totalRevenue: true,
      totalTimeToSellSeconds: true,
    },
  });

  // Cluster by zone prefix so "H1:1" + "H1:2" merge into "H1".
  type ZoneAccum = { itemsSold: number; revenue: number; totalSeconds: number };
  const zoneMap = new Map<string, ZoneAccum>();
  for (const row of rows) {
    const zone = parseZonePrefix(row.location);
    const acc = zoneMap.get(zone) ?? { itemsSold: 0, revenue: 0, totalSeconds: 0 };
    zoneMap.set(zone, {
      itemsSold: acc.itemsSold + (row._sum.itemsSold ?? 0),
      revenue: acc.revenue + (row._sum.totalRevenue ?? 0),
      totalSeconds: acc.totalSeconds + (row._sum.totalTimeToSellSeconds ?? 0),
    });
  }

  return Array.from(zoneMap.entries())
    .map(([location, acc]) => ({
      location,
      itemsSold: acc.itemsSold,
      revenue: acc.revenue,
      avgTimeToSellSeconds: acc.itemsSold > 0 ? acc.totalSeconds / acc.itemsSold : null,
    }))
    .sort((a, b) => b.itemsSold - a.itemsSold);
};

export const getCategoriesOverview = async (
  shopId: string,
  from: Date,
  to: Date,
): Promise<CategoryOverviewItem[]> => {
  const locations = await getKnownLocationsForShop(shopId);
  if (locations.length === 0) {
    return [];
  }

  const [categoryTotals, byLocation] = await Promise.all([
    prisma.locationCategoryStatsDaily.groupBy({
      by: ["itemCategory"],
      where: {
        date: { gte: from, lte: to },
        location: {
          in: locations,
        },
      },
      _sum: {
        itemsSold: true,
        totalRevenue: true,
        totalTimeToSellSeconds: true,
      },
      orderBy: {
        _sum: {
          itemsSold: "desc",
        },
      },
    }),
    prisma.locationCategoryStatsDaily.groupBy({
      by: ["itemCategory", "location"],
      where: {
        date: { gte: from, lte: to },
        location: {
          in: locations,
        },
      },
      _sum: {
        itemsSold: true,
      },
      orderBy: {
        _sum: {
          itemsSold: "desc",
        },
      },
    }),
  ]);

  const bestLocationByCategory = new Map<string, string>();
  for (const row of byLocation) {
    if (
      !bestLocationByCategory.has(row.itemCategory) &&
      row.location !== "UNKNOWN_POSITION" &&
      !row.location.startsWith("SOLD_ORDER:")
    ) {
      bestLocationByCategory.set(row.itemCategory, parseZonePrefix(row.location));
    }
  }

  return categoryTotals.map((category) => {
    const itemsSold = category._sum.itemsSold ?? 0;
    const totalTimeToSellSeconds =
      category._sum.totalTimeToSellSeconds ?? 0;

    return {
      category: category.itemCategory,
      itemsSold,
      totalRevenue: category._sum.totalRevenue ?? 0,
      avgTimeToSellSeconds:
        itemsSold > 0 ? totalTimeToSellSeconds / itemsSold : null,
      bestLocation: bestLocationByCategory.get(category.itemCategory) ?? null,
    };
  });
};

export const getDimensionsStats = async (
  shopId: string,
  from: Date,
  to: Date,
): Promise<DimensionsStats> => {
  const items = await prisma.scanHistory.findMany({
    where: {
      shopId,
      createdAt: {
        gte: from,
        lte: to,
      },
    },
    select: {
      isSold: true,
      itemHeight: true,
      itemWidth: true,
      itemDepth: true,
      volume: true,
    },
  });

  return {
    height: bucketize(
      items.map((item) => ({
        value: item.itemHeight,
        isSold: item.isSold,
      })),
      HEIGHT_BUCKETS,
    ),
    width: bucketize(
      items.map((item) => ({
        value: item.itemWidth,
        isSold: item.isSold,
      })),
      WIDTH_BUCKETS,
    ),
    depth: bucketize(
      items.map((item) => ({
        value: item.itemDepth,
        isSold: item.isSold,
      })),
      WIDTH_BUCKETS,
    ),
    volume: bucketize(
      items.map((item) => ({
        value: item.volume,
        isSold: item.isSold,
      })),
      VOLUME_BUCKETS,
    ),
  };
};

export const getSalesVelocity = async (
  from: Date,
  to: Date,
  shopId?: string,
  salesChannel?: "webshop" | "physical" | "imported" | "unknown",
): Promise<VelocityPoint[]> => {
  if (shopId || salesChannel) {
    const rows = await prismaWithSalesChannelStats.salesChannelStatsDaily.groupBy({
      by: ["date"],
      where: {
        ...(shopId ? { shopId } : {}),
        ...(salesChannel ? { salesChannel } : {}),
        date: { gte: from, lte: to },
      },
      _sum: {
        itemsSold: true,
        totalRevenue: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    return rows.map((row: (typeof rows)[number]) => ({
      date: toIsoDate(row.date),
      itemsSold: row._sum.itemsSold ?? 0,
      revenue: row._sum.totalRevenue ?? 0,
    }));
  }

  const rows = await prisma.locationStatsDaily.groupBy({
    by: ["date"],
    where: { date: { gte: from, lte: to } },
    _sum: {
      itemsSold: true,
      totalValuation: true,
    },
    orderBy: {
      date: "asc",
    },
  });

  return rows.map((row) => ({
    date: toIsoDate(row.date),
    itemsSold: row._sum.itemsSold ?? 0,
    revenue: row._sum.totalValuation ?? 0,
  }));
};

export const getSalesChannelOverview = async (
  shopId: string,
  from: Date,
  to: Date,
): Promise<SalesChannelOverviewItem[]> => {
  const rows = await prismaWithSalesChannelStats.salesChannelStatsDaily.groupBy({
    by: ["salesChannel"],
    where: {
      shopId,
      date: { gte: from, lte: to },
    },
    _sum: {
      itemsSold: true,
      totalRevenue: true,
    },
    orderBy: {
      _sum: {
        itemsSold: "desc",
      },
    },
  });

  return rows.map((row: (typeof rows)[number]) => ({
    salesChannel: row.salesChannel,
    itemsSold: row._sum.itemsSold ?? 0,
    totalRevenue: row._sum.totalRevenue ?? 0,
  }));
};

export const getSmartInsights = async (
  shopId: string,
  from: Date,
  to: Date,
): Promise<SmartInsight[]> => {
  const insights: SmartInsight[] = [];
  const zones = await getZonesOverview(shopId, from, to);

  if (zones.length === 0) {
    return insights;
  }

  // Exclude sentinel locations from all insight calculations
  const realZones = zones.filter(
    (z) =>
      z.location !== "UNKNOWN_POSITION" &&
      !z.location.startsWith("SOLD_ORDER:"),
  );

  if (realZones.length === 0) {
    return insights;
  }

  const sortedByVolume = [...realZones].sort(
    (a, b) => b.itemsSold - a.itemsSold,
  );
  const topVolumeZone = sortedByVolume[0];
  const bottomZone = sortedByVolume[sortedByVolume.length - 1];

  // Best volume zone
  if (topVolumeZone && topVolumeZone.itemsSold > 0) {
    insights.push({
      type: "positive",
      message: `${topVolumeZone.location} is your best performing zone with ${topVolumeZone.itemsSold} items sold.`,
    });
  }

  // Warning: zones with no sales
  const emptyZones = sortedByVolume.filter((z) => z.itemsSold === 0);
  if (emptyZones.length > 0 && sortedByVolume.some((z) => z.itemsSold > 0)) {
    const message =
      emptyZones.length <= 3
        ? `${emptyZones.map((z) => z.location).join(", ")} had no sales in this period. Consider reorganising.`
        : `${emptyZones.length} zones had no sales this period (e.g. ${emptyZones.slice(0, 3).map((z) => z.location).join(", ")}). Consider reorganising.`;

    insights.push({ type: "warning", message });
  }

  // Best revenue zone — only surfaced when it differs from the volume leader
  const soldZones = realZones.filter((z) => z.itemsSold > 0);
  const topRevenueZone = [...soldZones].sort((a, b) => b.revenue - a.revenue)[0];

  if (
    topRevenueZone &&
    topVolumeZone &&
    topRevenueZone.location !== topVolumeZone.location
  ) {
    insights.push({
      type: "positive",
      message: `${topRevenueZone.location} generated the most revenue (${topRevenueZone.revenue.toLocaleString()}) despite fewer items sold than ${topVolumeZone.location}.`,
    });
  }

  // Best revenue-per-item zone — requires at least 2 items to be meaningful,
  // and must differ from both leaders above to avoid repetition
  const topValueZone = soldZones
    .filter((z) => z.itemsSold >= 2)
    .map((z) => ({ ...z, revenuePerItem: z.revenue / z.itemsSold }))
    .sort((a, b) => b.revenuePerItem - a.revenuePerItem)[0];

  if (
    topValueZone &&
    topValueZone.location !== topVolumeZone?.location &&
    topValueZone.location !== topRevenueZone?.location
  ) {
    insights.push({
      type: "positive",
      message: `${topValueZone.location} has the highest average item value at ${Math.round(topValueZone.revenuePerItem).toLocaleString()} per item.`,
    });
  }

  // Speed insight — uses real zones only so UNKNOWN_POSITION (avgTime=0) doesn't drag down the average
  const totalSold = realZones.reduce((sum, zone) => sum + zone.itemsSold, 0);
  const totalSeconds = realZones.reduce((sum, zone) => {
    return sum + (zone.avgTimeToSellSeconds ?? 0) * zone.itemsSold;
  }, 0);
  const overallAverage = totalSold > 0 ? totalSeconds / totalSold : null;

  if (
    overallAverage !== null &&
    overallAverage > 0 &&
    topVolumeZone?.avgTimeToSellSeconds !== null &&
    topVolumeZone?.avgTimeToSellSeconds !== undefined
  ) {
    const percentageFaster =
      ((overallAverage - topVolumeZone.avgTimeToSellSeconds) / overallAverage) *
      100;

    if (percentageFaster > 20) {
      insights.push({
        type: "positive",
        message: `Items sell ${percentageFaster.toFixed(0)}% faster in ${topVolumeZone.location} than average.`,
      });
    }
  }

  const channels = await getSalesChannelOverview(shopId, from, to);
  const webshop = channels.find((entry) => entry.salesChannel === "webshop");
  const physical = channels.find((entry) => entry.salesChannel === "physical");

  if (webshop && physical && webshop.itemsSold > 0 && physical.itemsSold > 0) {
    const message =
      webshop.itemsSold >= physical.itemsSold
        ? `Webshop sold ${(webshop.itemsSold / physical.itemsSold).toFixed(1)}x the volume of physical locations in this period.`
        : `Physical locations sold ${(physical.itemsSold / webshop.itemsSold).toFixed(1)}x the volume of the webshop in this period.`;

    insights.push({ type: "neutral", message });
  }

  return insights;
};

// ---------------------------------------------------------------------------
// Sales time patterns — hour-of-day and day-of-week distributions
// ---------------------------------------------------------------------------

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function padHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function markPeak<T extends { itemsSold: number }>(
  rows: T[],
): (T & { isPeak: boolean })[] {
  if (rows.length === 0) return [];
  const maxSold = Math.max(...rows.map((r) => r.itemsSold));
  let peakMarked = false;
  return rows.map((r) => {
    const isPeak = !peakMarked && r.itemsSold === maxSold && maxSold > 0;
    if (isPeak) peakMarked = true;
    return { ...r, isPeak };
  });
}

export const getTimePatterns = async (
  shopId: string,
  from: Date,
  to: Date,
  salesChannel?: "webshop" | "physical" | "imported" | "unknown",
  latestLocation?: string,
  itemCategory?: string,
): Promise<TimePatterns> => {
  // Use Prisma ORM for filtering (avoids raw SQL datetime format uncertainty)
  // then aggregate in JS — consistent with how the rest of the stats repo works.
  const records = await prisma.scanHistory.findMany({
    where: {
      AND: [
        { shopId },
        { isSold: true },
        { lastModifiedAt: { gte: from, lte: to } },
        ...(salesChannel ? [{ lastSoldChannel: salesChannel as Prisma.EnumSalesChannelFilter }] : []),
        ...(latestLocation ? [{ latestLocation }] : []),
        ...(itemCategory ? [{ itemCategory }] : []),
      ],
    },
    select: {
      lastModifiedAt: true,
      quantity: true,
      priceHistory: {
        orderBy: { happenedAt: "desc" as const },
        take: 1,
        select: { price: true },
      },
    },
  });

  const hourMap = new Map<number, { itemsSold: number; revenue: number }>();
  const weekdayMap = new Map<number, { itemsSold: number; revenue: number }>();

  for (const record of records) {
    const dt = record.lastModifiedAt;
    const hour = dt.getUTCHours();
    const weekday = dt.getUTCDay();
    const qty = record.quantity ?? 1;
    const price = parseFloat(record.priceHistory[0]?.price ?? "0") || 0;

    const h = hourMap.get(hour) ?? { itemsSold: 0, revenue: 0 };
    hourMap.set(hour, { itemsSold: h.itemsSold + qty, revenue: h.revenue + price * qty });

    const w = weekdayMap.get(weekday) ?? { itemsSold: 0, revenue: 0 };
    weekdayMap.set(weekday, { itemsSold: w.itemsSold + qty, revenue: w.revenue + price * qty });
  }

  const allHours: Omit<TimePatternHourPoint, "isPeak">[] = Array.from(
    { length: 24 },
    (_, h) => ({
      hour: h,
      label: padHour(h),
      itemsSold: hourMap.get(h)?.itemsSold ?? 0,
      revenue: hourMap.get(h)?.revenue ?? 0,
    }),
  );

  const allWeekdays: Omit<TimePatternWeekdayPoint, "isPeak">[] = Array.from(
    { length: 7 },
    (_, d) => ({
      weekday: d,
      label: WEEKDAY_LABELS[d] as string,
      itemsSold: weekdayMap.get(d)?.itemsSold ?? 0,
      revenue: weekdayMap.get(d)?.revenue ?? 0,
    }),
  );

  return {
    byHour: markPeak(allHours),
    byWeekday: markPeak(allWeekdays),
  };
};

export const statsRepository = {
  getZonesOverview,
  getZoneDetail,
  getCategoriesOverview,
  getCategoryByLocation,
  getDimensionsStats,
  getSalesVelocity,
  getSalesChannelOverview,
  getSmartInsights,
  getTimePatterns,
};
