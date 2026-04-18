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
  lastSoldChannel: string | null;
  orderId: string | null;
  orderNumber: number | null;
  intention: string | null;
  fixItem: boolean | null;
  /** Latest price entry from priceHistory, null if none recorded */
  lastKnownPrice: string | null;
  /** (lastModifiedAt - createdAt) in seconds. Only set when isSold = true */
  timeToSellSeconds: number | null;
  lastModifiedAt: Date;
  createdAt: Date;
};

export type StatsItemsPage = {
  items: StatsItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type StatsItemsFilters = {
  from?: Date;
  to?: Date;
  latestLocation?: string;
  isSold?: boolean;
  itemCategory?: string;
  lastSoldChannel?: "webshop" | "physical" | "imported" | "unknown";
  heightMin?: number;
  heightMax?: number;
  widthMin?: number;
  widthMax?: number;
  depthMin?: number;
  depthMax?: number;
  volumeMin?: number;
  volumeMax?: number;
  hourOfDay?: number;
  weekday?: number;
};

export type StatsItemsSortBy = "lastModifiedAt" | "lastKnownPrice" | "timeToSell" | "timeInStock";
export type StatsItemsSortDir = "asc" | "desc";

export type StatsItemsSort = {
  sortBy: StatsItemsSortBy;
  sortDir: StatsItemsSortDir;
};
