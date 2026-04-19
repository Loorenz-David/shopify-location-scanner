export type LogisticIntentionDto =
  | "customer_took_it"
  | "store_pickup"
  | "local_delivery"
  | "international_shipping";

export type LogisticEventTypeDto = "marked_intention" | "placed" | "fulfilled";
export type LogisticZoneTypeDto = "for_delivery" | "for_pickup" | "for_fixing";

export interface LogisticTaskItemDto {
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
  intention: LogisticIntentionDto | null;
  fixItem: boolean | null;
  scheduledDate: string | null;
  lastLogisticEventType: LogisticEventTypeDto | null;
  isItemFixed: boolean | null;
  fixNotes: string | null;
  updatedAt: string;
  logisticEvent: {
    username: string;
    eventType: LogisticEventTypeDto;
    location: string | null;
    zoneType: LogisticZoneTypeDto | null;
  } | null;
}

export interface LogisticOrderGroupDto {
  orderId: string | null;
  items: LogisticTaskItemDto[];
}

export interface GetLogisticTasksResponseDto {
  orders: LogisticOrderGroupDto[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface MarkIntentionRequestDto {
  scanHistoryId: string;
  intention: LogisticIntentionDto;
  fixItem: boolean;
  fixNotes?: string;
  scheduledDate?: string;
}

export interface MarkIntentionResponseDto {
  scheduledDate: string | null;
}

export interface MarkPlacementRequestDto {
  scanHistoryId: string;
  logisticLocationId: string;
}

export interface FulfilItemRequestDto {
  scanHistoryId: string;
}
