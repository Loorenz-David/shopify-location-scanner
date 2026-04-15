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
};
