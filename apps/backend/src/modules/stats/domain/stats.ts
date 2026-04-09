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
    avgTimeToSellSeconds: number | null;
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

export type SalesChannelOverviewItem = {
  salesChannel: "webshop" | "physical" | "imported" | "unknown";
  itemsSold: number;
  totalRevenue: number;
};
