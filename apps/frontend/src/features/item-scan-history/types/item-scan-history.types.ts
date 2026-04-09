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

export interface ItemScanHistoryItem {
  id: string;
  categoryLabel: string | null;
  skuLabel: string;
  barcodeLabel: string | null;
  title: string;
  imageUrl: string | null;
  productId: string;
  itemType: "product_id" | "handle" | "sku" | "barcode";
  itemHeight: number | null;
  itemWidth: number | null;
  itemDepth: number | null;
  volume: number | null;
  lastModifiedAt: string;
  lastModifiedLabel: string;
  latestLocationLabel: string;
  latestUsername: string;
  lastSoldChannel: SalesChannel | null;
  events: ItemScanHistoryEvent[];
  priceHistory: ItemScanHistoryPriceHistory[];
}
