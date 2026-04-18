export type SalesChannel = "webshop" | "physical" | "imported" | "unknown";

export type SalesChannelOverviewItem = {
  salesChannel: SalesChannel;
  itemsSold: number;
  totalRevenue: number;
};

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
  isLevelView: boolean; // true when fetched as a specific level (e.g. "H1:2")
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
  bestLocation: string | null;
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

export type StoreZoneType = "zone" | "corridor";

export type StoreZone = {
  id: string;
  label: string;
  type: StoreZoneType;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  sortOrder: number;
};

export type CreateStoreZoneInput = Omit<StoreZone, "id">;

export type UpdateStoreZoneInput = Partial<
  Omit<StoreZone, "id">
>;

export type ReorderStoreZonesInput = Array<{
  id: string;
  sortOrder: number;
}>;

export type DateRange = {
  from: string;
  to: string;
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
