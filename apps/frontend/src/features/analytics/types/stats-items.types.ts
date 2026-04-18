import type { SalesChannel } from "./analytics.types";

export type StatsItemCardMode =
  | "sold-default"
  | "avg-sell-time"
  | "received"
  | "with-channel"
  | "dimensions"
  | "zone-standard";

export type StatsItemsSortBy =
  | "lastModifiedAt"
  | "lastKnownPrice"
  | "timeToSell"
  | "timeInStock";
export type StatsItemsSortDir = "asc" | "desc";

export type StatsItemsQuery = {
  page?: number;
  from?: string;
  to?: string;
  hourOfDay?: number;
  weekday?: number;
  isSold?: boolean;
  latestLocation?: string;
  itemCategory?: string;
  lastSoldChannel?: SalesChannel;
  heightMin?: number;
  heightMax?: number;
  widthMin?: number;
  widthMax?: number;
  depthMin?: number;
  depthMax?: number;
  volumeLabel?: "tiny" | "small" | "medium" | "large" | "extra_large";
  sortBy?: StatsItemsSortBy;
  sortDir?: StatsItemsSortDir;
  groupByOrder?: boolean;
};

export type StatsItemsOverlayConfig = {
  query: StatsItemsQuery;
  cardMode: StatsItemCardMode;
  title: string;
  controls?: {
    showStatusFilter?: boolean;
    showSortToggle?: boolean;
    showTimeToSellSort?: boolean;
    salesChannelOptions?: SalesChannel[];
  };
};

export type StatsItemsOverlayFilters = {
  isSold: boolean | null;
  sortOrder: "newest" | "oldest";
  lastSoldChannel: SalesChannel | null;
};

export type StatsItem = {
  id: string;
  username: string;
  itemImageUrl: string | null;
  itemCategory: string | null;
  itemSku: string | null;
  itemTitle: string;
  itemHeight: number | null;
  itemWidth: number | null;
  itemDepth: number | null;
  volume: number | null;
  quantity: number;
  latestLocation: string | null;
  isSold: boolean;
  lastSoldChannel: SalesChannel | null;
  orderId: string | null;
  orderNumber: number | null;
  intention: string | null;
  fixItem: boolean | null;
  lastKnownPrice: string | null;
  timeToSellSeconds: number | null;
  lastModifiedAt: string;
  createdAt: string;
};

export type StatsItemsPage = {
  items: StatsItem[];
  total: number;
  page: number;
  pageSize: number;
};
