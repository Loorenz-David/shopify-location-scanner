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

export interface ItemScanHistoryLogisticEventDto {
  username: string;
  eventType: "marked_intention" | "placed" | "fulfilled";
  description?: string | null;
  location: string | null;
  zoneType?: "for_delivery" | "for_pickup" | "for_fixing" | null;
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
  properties?: Record<string, string | number> | null;
  quantity: number;
  lastModifiedAt: string;
  latestLocation?: string | null;
  lastLogisticLocation?: string | null;
  logisticsCompletedAt?: string | null;
  lastSoldChannel?: SalesChannel | null;
  events: ItemScanHistoryEventDto[];
  logisticEvents?: ItemScanHistoryLogisticEventDto[];
  logisticEvent?:
    | ItemScanHistoryLogisticEventDto[]
    | ItemScanHistoryLogisticEventDto
    | null;
  priceHistory: ItemScanHistoryPriceHistoryDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ItemScanHistoryPayloadDto {
  items: ItemScanHistoryEntryDto[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ItemScanHistoryResponseDto {
  history: ItemScanHistoryPayloadDto;
}
