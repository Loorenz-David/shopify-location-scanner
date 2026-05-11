import type {
  ScanHistoryEventType,
  ScanHistoryPriceTerminalType,
} from "./item-scan-history.enums";
import type { SalesChannel } from "../../analytics/types/analytics.types";

export interface ItemScanHistoryEvent {
  id: string;
  eventType: ScanHistoryEventType;
  orderId: string | null;
  orderGroupId: string | null;
  location: string;
  happenedAt: string;
  happenedAtLabel: string;
  username: string;
}

export interface ItemScanHistoryPriceHistory {
  id: string;
  price: string | null;
  terminalType: ScanHistoryPriceTerminalType | null;
  orderId: string | null;
  orderGroupId: string | null;
  happenedAt: string;
  happenedAtLabel: string;
}

export interface ItemScanHistoryLogisticEvent {
  id: string;
  eventType: "marked_intention" | "placed" | "fulfilled";
  description: string | null;
  location: string | null;
  happenedAt: string;
  happenedAtLabel: string;
  username: string;
}

export type ItemScanHistoryTimelineEvent =
  | ({ kind: "scan" } & ItemScanHistoryEvent)
  | ({ kind: "logistic" } & ItemScanHistoryLogisticEvent);

export interface ItemScanHistoryItem {
  id: string;
  categoryLabel: string | null;
  skuLabel: string;
  barcodeLabel: string | null;
  title: string;
  imageUrl: string | null;
  imageUrls: string | null;
  productId: string;
  itemType: "product_id" | "handle" | "sku" | "barcode";
  itemHeight: number | null;
  itemWidth: number | null;
  itemDepth: number | null;
  volume: number | null;
  quantity: number;
  createdAt: string;
  isSold: boolean;
  timeToSellSeconds: number | null;
  lastModifiedAt: string;
  lastModifiedLabel: string;
  latestLocationLabel: string;
  latestUsername: string;
  lastSoldChannel: SalesChannel | null;
  logisticsCompletedAt: string | null;
  events: ItemScanHistoryEvent[];
  logisticEvents: ItemScanHistoryLogisticEvent[];
  timelineEvents: ItemScanHistoryTimelineEvent[];
  priceHistory: ItemScanHistoryPriceHistory[];
}
