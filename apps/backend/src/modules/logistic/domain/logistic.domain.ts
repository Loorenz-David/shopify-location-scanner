export type LogisticIntention =
  | "customer_took_it"
  | "store_pickup"
  | "local_delivery"
  | "international_shipping";

export type LogisticEventType = "marked_intention" | "placed" | "fulfilled";

export type LogisticZoneType = "for_delivery" | "for_pickup" | "for_fixing";

export type LogisticLocation = {
  id: string;
  shopId: string;
  location: string;
  zoneType: LogisticZoneType;
  createdAt: Date;
  updatedAt: Date;
};

export type LogisticEvent = {
  id: string;
  scanHistoryId: string;
  shopId: string;
  orderId: string | null;
  logisticLocationId: string | null;
  username: string;
  eventType: LogisticEventType;
  happenedAt: Date;
  createdAt: Date;
  logisticLocation: LogisticLocation | null;
};

export type LogisticItemSummary = {
  id: string;
  productId: string;
  itemSku: string | null;
  itemBarcode: string | null;
  itemImageUrl: string | null;
  itemCategory: string | null;
  itemType: string;
  itemTitle: string;
  latestLocation: string | null;
  orderId: string | null;
  orderNumber: number | null;
  intention: LogisticIntention;
  fixItem: boolean | null;
  isItemFixed: boolean;
  fixNotes: string | null;
  scheduledDate: Date | null;
  lastLogisticEventType: LogisticEventType | null;
  updatedAt: Date;
  logisticEvent: {
    username: string;
    eventType: LogisticEventType;
    location: string | null;
    zoneType: LogisticZoneType | null;
  } | null;
};

export type LogisticItemsPage = {
  orders: Array<{
    orderId: string | null;
    items: LogisticItemSummary[];
  }>;
  hasMore: boolean;
  nextCursor: string | null;
};

// Maps a LogisticZoneType to the default LogisticIntention to assign when
// a scan history record has no intention set at the time of placement.
// for_delivery covers both domestic (local_delivery) and international
// shipments; local_delivery is used as the auto-assignment default since it
// is the more common case. for_fixing has no meaningful default — leave null.
export const ZONE_TYPE_DEFAULT_INTENTION: Partial<Record<LogisticZoneType, LogisticIntention>> = {
  for_delivery: "local_delivery",
  for_pickup: "store_pickup",
  // for_fixing → omitted (no default; remains null)
};
