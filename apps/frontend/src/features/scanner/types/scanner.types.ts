export type ScannerStep = "item" | "location";

export type ScannerItemIdType = "product_id" | "handle" | "sku" | "barcode";

export interface ScannerItem {
  id: string;
  idType: ScannerItemIdType;
  itemId: string;
  sku: string;
  imageUrl?: string;
  title?: string;
  currentPosition?: string;
}

export interface ScannerLocation {
  code: string;
  label: string;
}

export interface ScannerLocationOption {
  label: string;
  value: string;
}

export interface ItemSearchApiItem {
  productId: string;
  imageUrl?: string;
  sku: string;
}

export interface ItemSearchApiResponse {
  items: ItemSearchApiItem[];
  count: number;
}

export interface LocationOptionsBootstrapResponse {
  metafield: {
    namespace: string;
    key: string;
    type: string;
    options: ScannerLocationOption[];
  };
}

export interface ScannerLens {
  id: string;
  label: string;
}

export interface ScannerFrozenFrame {
  dataUrl: string;
  width: number;
  height: number;
}

export interface ScannerLinkError {
  compactMessage: string;
  details: string;
  sku?: string;
  position?: string;
}

export interface ScannerLinkOperation {
  isLinking: boolean;
  canScanNext: boolean;
  lastLinkedPairKey: string | null;
  lastError: ScannerLinkError | null;
}

export interface LinkItemLocationInput {
  idType: ScannerItemIdType;
  itemId: string;
  location: string;
}

export interface LinkItemPositionsBatchRequest {
  items: LinkItemLocationInput[];
}

export type LinkItemPositionsRequest =
  | LinkItemLocationInput
  | LinkItemPositionsBatchRequest;

export interface LinkHistoryItemResponse {
  id: string;
  shopId: string;
  userId: string | null;
  username: string;
  productId: string;
  itemSku: string | null;
  itemType: ScannerItemIdType;
  itemTitle: string;
  itemImageUrl: string | null;
  lastModifiedAt: string;
  events: Array<{
    location: string;
    happenedAt: string;
    username: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface LinkItemPositionsResponse {
  product: {
    id: string;
    title: string;
    location: string;
    previousLocation?: string;
    updatedAt: string;
    sku?: string;
    imageUrl?: string | null;
    itemType?: ScannerItemIdType;
  };
  historyItem?: LinkHistoryItemResponse;
}

export interface LinkItemPositionsBatchResult {
  index: number;
  idType: ScannerItemIdType;
  itemId: string;
  ok: boolean;
  product?: LinkItemPositionsResponse["product"];
  historyItem?: LinkHistoryItemResponse;
  error?: {
    code: string;
    message: string;
  };
}

export interface LinkItemPositionsBatchResponse {
  results: LinkItemPositionsBatchResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

export type LinkItemPositionsApiResponse =
  | LinkItemPositionsResponse
  | LinkItemPositionsBatchResponse;
