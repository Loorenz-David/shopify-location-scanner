export type LogisticIntention =
  | "customer_took_it"
  | "store_pickup"
  | "local_delivery"
  | "international_shipping";

export type LogisticEventType = "marked_intention" | "placed" | "fulfilled";
export type LogisticZoneType = "for_delivery" | "for_pickup" | "for_fixing";

export interface LogisticTaskItem {
  id: string;
  productId: string;
  sku: string | null;
  imageUrl: string | null;
  itemType: string;
  itemTitle: string;
  location: string | null;
  orderId: string | null;
  orderNumber: number | null;
  intention: LogisticIntention | null;
  fixItem: boolean;
  scheduledDate: Date | null;
  lastEventType: LogisticEventType | null;
  logisticLocation: string | null;
  logisticZoneType: LogisticZoneType | null;
  isItemFixed: boolean;
  fixNotes: string | null;
  updatedAt: Date;
}

export interface LogisticOrderGroup {
  orderId: string | null;
  items: LogisticTaskItem[];
}

export interface LogisticTaskFilters {
  fixItem?: boolean;
  isItemFixed?: boolean;
  lastLogisticEventType?: LogisticEventType;
  zoneType?: LogisticZoneType;
  intention?: LogisticIntention;
  orderId?: string;
  noIntention?: boolean;
}
