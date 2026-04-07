export interface ScannerHistoryEventDto {
  location: string;
  happenedAt: string;
}

export interface ScannerHistoryItemDto {
  id: string;
  shopId: string;
  userId: string | null;
  username: string;
  productId: string;
  itemSku: string | null;
  itemType: "product_id" | "handle" | "sku";
  itemTitle: string;
  lastModifiedAt: string;
  events: ScannerHistoryEventDto[];
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
