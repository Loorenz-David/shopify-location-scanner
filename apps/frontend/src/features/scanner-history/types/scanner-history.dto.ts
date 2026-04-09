export type ScanHistoryEventType =
  | "location_update"
  | "unknown_position"
  | "sold_terminal";

export type ScanHistoryPriceTerminalType =
  | "unknown_position"
  | "sold_terminal"
  | "price_update";

export interface ScannerHistoryEventDto {
  username: string;
  eventType: ScanHistoryEventType;
  orderId: string | null;
  orderGroupId: string | null;
  location: string;
  happenedAt: string;
}

export interface ScannerHistoryPriceHistoryDto {
  price: string | null;
  terminalType: ScanHistoryPriceTerminalType | null;
  orderId: string | null;
  orderGroupId: string | null;
  happenedAt: string;
}

export interface ScannerHistoryItemDto {
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
  events: ScannerHistoryEventDto[];
  priceHistory: ScannerHistoryPriceHistoryDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ScannerHistoryPayloadDto {
  items: ScannerHistoryItemDto[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ScannerHistoryResponseDto {
  history: ScannerHistoryPayloadDto;
}
