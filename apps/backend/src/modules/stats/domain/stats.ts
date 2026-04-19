export type ZoneOverviewItem = {
  location: string;
  itemsSold: number;
  itemsReceived: number;
  revenue: number;
  avgTimeToSellSeconds: number | null;
  levelCount: number; // 1 for single-level zones; N when H1:1 … H1:N exist
};

export type ZoneLevelBreakdown = {
  level: string; // full location string e.g. "H1:2"
  itemsSold: number;
  itemsReceived: number;
  revenue: number;
  avgTimeToSellSeconds: number | null;
};

export type ZoneDetail = {
  location: string;
  isLevelView: boolean; // true when requested as a specific level (e.g. "H1:2")
  kpis: {
    itemsSold: number;
    itemsReceived: number;
    revenue: number;
    avgTimeToSellSeconds: number | null;
  };
  categories: Array<{
    category: string;
    itemsSold: number;
    revenue: number;
    avgTimeToSellSeconds: number | null;
  }>;
  dailySeries: Array<{
    date: string;
    itemsSold: number;
    revenue: number;
  }>;
  levels: ZoneLevelBreakdown[] | null; // null when isLevelView=true or zone has only one level
};

export type CategoryOverviewItem = {
  category: string;
  itemsSold: number;
  totalRevenue: number;
  avgTimeToSellSeconds: number | null;
  bestLocationByVolume: string | null;
  bestLocationByRevenue: string | null;
};

export type DimensionBucket = {
  bucket: string;
  label: string;
  soldCount: number;
  totalCount: number;
};

export type DimensionsStats = {
  height: DimensionBucket[];
  width: DimensionBucket[];
  depth: DimensionBucket[];
  volume: DimensionBucket[];
};

export type VelocityPoint = {
  date: string;
  itemsSold: number;
  revenue: number;
};

export type SmartInsight = {
  type: "positive" | "warning" | "neutral";
  message: string;
};

export type SalesChannelOverviewItem = {
  salesChannel: "webshop" | "physical" | "imported" | "unknown";
  itemsSold: number;
  totalRevenue: number;
};

export type TimePatternHourPoint = {
  hour: number;
  label: string;
  itemsSold: number;
  revenue: number;
  isPeak: boolean;
};

export type TimePatternWeekdayPoint = {
  weekday: number;
  label: string;
  itemsSold: number;
  revenue: number;
  isPeak: boolean;
};

export type TimePatterns = {
  byHour: TimePatternHourPoint[];
  byWeekday: TimePatternWeekdayPoint[];
};
