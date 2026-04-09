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
};

export type ZoneDetail = {
  location: string;
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
