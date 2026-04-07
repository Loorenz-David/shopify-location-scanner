export interface ItemScanHistoryEventDto {
  location: string;
  happenedAt: string;
  username: string;
}

export interface ItemScanHistoryEntryDto {
  id: string;
  shopId: string;
  userId: string | null;
  username: string;
  productId: string;
  itemSku: string | null;
  itemType: "product_id" | "handle" | "sku";
  itemTitle: string;
  itemImageUrl: string | null;
  lastModifiedAt: string;
  events: ItemScanHistoryEventDto[];
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
