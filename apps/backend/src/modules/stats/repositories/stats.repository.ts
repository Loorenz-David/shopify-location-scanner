import { prisma } from "../../../shared/database/prisma-client.js";
import type {
  CategoryOverviewItem,
  DimensionsStats,
  DimensionBucket,
  SalesChannelOverviewItem,
  SmartInsight,
  VelocityPoint,
  ZoneDetail,
  ZoneOverviewItem,
} from "../domain/stats.js";

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
  if (locations.length === 0) {
    return [];
  }

  const rows = await prisma.locationStatsDaily.groupBy({
    by: ["location"],
    where: {
      date: { gte: from, lte: to },
      location: {
        in: locations,
      },
    },
    _sum: {
      itemsSold: true,
      itemsReceived: true,
      totalTimeToSellSeconds: true,
      totalValuation: true,
    },
    orderBy: {
      _sum: {
        itemsSold: "desc",
      },
    },
  });

  return rows.map((row) => {
    const itemsSold = row._sum.itemsSold ?? 0;
    const totalSeconds = row._sum.totalTimeToSellSeconds ?? 0;

    return {
      location: row.location,
      itemsSold,
      itemsReceived: row._sum.itemsReceived ?? 0,
      revenue: row._sum.totalValuation ?? 0,
      avgTimeToSellSeconds: itemsSold > 0 ? totalSeconds / itemsSold : null,
    };
  });
};

export const getZoneDetail = async (
  shopId: string,
  location: string,
  from: Date,
  to: Date,
): Promise<Omit<ZoneDetail, "location">> => {
  const locations = await getKnownLocationsForShop(shopId);
  if (!locations.includes(location)) {
    return {
      kpis: {
        itemsSold: 0,
        itemsReceived: 0,
        revenue: 0,
        avgTimeToSellSeconds: null,
      },
      categories: [],
      dailySeries: [],
    };
  }

  const [daily, categories] = await Promise.all([
    prisma.locationStatsDaily.findMany({
      where: {
        location,
        date: { gte: from, lte: to },
      },
      orderBy: { date: "asc" },
    }),
    prisma.locationCategoryStatsDaily.groupBy({
      by: ["itemCategory"],
      where: {
        location,
        date: { gte: from, lte: to },
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
  ]);

  const totalSold = daily.reduce((sum, row) => sum + row.itemsSold, 0);
  const totalReceived = daily.reduce((sum, row) => sum + row.itemsReceived, 0);
  const totalRevenue = daily.reduce((sum, row) => sum + row.totalValuation, 0);
  const totalSeconds = daily.reduce(
    (sum, row) => sum + row.totalTimeToSellSeconds,
    0,
  );

  return {
    kpis: {
      itemsSold: totalSold,
      itemsReceived: totalReceived,
      revenue: totalRevenue,
      avgTimeToSellSeconds: totalSold > 0 ? totalSeconds / totalSold : null,
    },
    categories: categories.map((category) => {
      const itemsSold = category._sum.itemsSold ?? 0;
      const totalTimeToSellSeconds =
        category._sum.totalTimeToSellSeconds ?? 0;

      return {
        category: category.itemCategory,
        itemsSold,
        revenue: category._sum.totalRevenue ?? 0,
        avgTimeToSellSeconds:
          itemsSold > 0 ? totalTimeToSellSeconds / itemsSold : null,
      };
    }),
    dailySeries: daily.map((row) => ({
      date: toIsoDate(row.date),
      itemsSold: row.itemsSold,
      revenue: row.totalValuation,
    })),
  };
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
      bestLocationByCategory.set(row.itemCategory, row.location);
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

export const statsRepository = {
  getZonesOverview,
  getZoneDetail,
  getCategoriesOverview,
  getDimensionsStats,
  getSalesVelocity,
  getSalesChannelOverview,
  getSmartInsights,
};
