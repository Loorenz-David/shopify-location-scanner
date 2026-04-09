import type {
  ScanHistoryEventType,
  ScanHistoryPriceTerminalType,
} from "./item-scan-history.enums";
import type { SalesChannel } from "../../analytics/types/analytics.types";

export interface ItemScanHistoryEventDto {
  username: string;
  eventType: ScanHistoryEventType;
  orderId: string | null;
  orderGroupId: string | null;
  location: string;
  happenedAt: string;
}

export interface ItemScanHistoryPriceHistoryDto {
  price: string | null;
  terminalType: ScanHistoryPriceTerminalType | null;
  orderId: string | null;
  orderGroupId: string | null;
  happenedAt: string;
}

export interface ItemScanHistoryEntryDto {
  id: string;
  shopId: string;
  userId: string | null;
  username: string;
  productId: string;
  itemCategory: string | null;
  itemSku: string | null;
  itemBarcode: string | null;
  itemType: "product_id" | "handle" | "sku" | "barcode";
  itemTitle: string;
  itemImageUrl: string | null;
  itemHeight: number | null;
  itemWidth: number | null;
  itemDepth: number | null;
  volume: number | null;
  lastModifiedAt: string;
  latestLocation?: string | null;
  lastSoldChannel?: SalesChannel | null;
  events: ItemScanHistoryEventDto[];
  priceHistory: ItemScanHistoryPriceHistoryDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ItemScanHistoryPayloadDto {
  items: ItemScanHistoryEntryDto[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ItemScanHistoryResponseDto {
  history: ItemScanHistoryPayloadDto;
}
