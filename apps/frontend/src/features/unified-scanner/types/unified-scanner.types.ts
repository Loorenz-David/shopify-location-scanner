import type {
  LogisticIntention,
  LogisticZoneType,
} from "../../logistic-tasks/types/logistic-tasks.types";

export type LocationScannerMode = "shop" | "logistic";

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

export interface ScannerLocationOption {
  label: string;
  value: string;
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

export interface UnifiedScannerItem extends ScannerItem {
  isSold: boolean;
  intention: LogisticIntention | null;
  fixItem: boolean;
  isItemFixed: boolean;
}

export type ResolvedLocation =
  | { mode: "shop"; code: string; label: string }
  | {
      mode: "logistic";
      id: string;
      location: string;
      zoneType: LogisticZoneType;
    };

export type LocationWarningType = "fix-check" | "zone-mismatch";

export const UNIFIED_SCANNER_POPUP_IDS: Record<LocationWarningType, string> = {
  "fix-check": "unified-scanner-fix-check",
  "zone-mismatch": "unified-scanner-zone-mismatch",
};

export interface LocationWarning {
  type: LocationWarningType;
  priority: number;
}

export interface LocationWarningRule {
  type: LocationWarningType;
  priority: number;
  evaluate(item: UnifiedScannerItem, location: ResolvedLocation): boolean;
}

export interface ItemModeRule {
  evaluate(item: UnifiedScannerItem): LocationScannerMode | null;
}

export type UnifiedScannerPhase =
  | "scanning-item"
  | "item-confirmed"
  | "scanning-location"
  | "warning-pending"
  | "placing"
  | "placed"
  | "error";

export interface UnifiedScannerStoreState {
  phase: UnifiedScannerPhase;
  selectedItem: UnifiedScannerItem | null;
  locationMode: LocationScannerMode | null;
  selectedLocation: ResolvedLocation | null;
  pendingLocationValue: string | null;
  pendingLocation: ResolvedLocation | null;
  pendingWarnings: LocationWarning[];
  activeWarning: LocationWarning | null;
  requiresZoneMismatchAfterFixCheck: boolean;
  frozenFrameAt: string | null;
  isLookingUpItem: boolean;
  itemLookupError: string | null;
  locationWarningBanner: string | null;
  lastPlacementError: string | null;
  canScanNext: boolean;
  flashEnabled: boolean;
  availableLenses: ScannerLens[];
  selectedLensId: string | null;
  onScanAsk: boolean;
}

export interface UnifiedScannerPageContextValue {
  isCameraReady: boolean;
  cameraError: string | null;
  itemFrozenFrame: ScannerFrozenFrame | null;
  itemDecodedText: string | null;
  locationFrozenFrame: ScannerFrozenFrame | null;
  locationDecodedText: string | null;
  phase: UnifiedScannerPhase;
  scannerStep: "item" | "location";
  selectedItem: UnifiedScannerItem | null;
  locationMode: LocationScannerMode | null;
  selectedLocation: ResolvedLocation | null;
  isLookingUpItem: boolean;
  itemLookupError: string | null;
  locationWarningBanner: string | null;
  lastPlacementError: string | null;
  canScanNext: boolean;
  flashEnabled: boolean;
  availableLenses: ScannerLens[];
  selectedLensId: string | null;
  onScanAsk: boolean;
  onBack: () => void;
  onToggleFlash: () => void;
  onSelectLens: (lensId: string) => void;
  onGoToLocationStep: () => void;
  onClearItemScan: () => void;
  onClearLocationScan: () => void;
  onScanNext: () => void;
  onDismissItemError: () => void;
  onDismissLocationWarning: () => void;
  onDismissPlacementError: () => void;
  onToggleOnScanAsk: () => void;
}

export interface UnifiedItemSearchResult {
  productId: string;
  imageUrl: string;
  sku: string;
  title?: string;
  currentPosition: string | null;
  id: string;
  isSold: boolean;
  intention: LogisticIntention | null;
  fixItem: boolean;
  isItemFixed: boolean;
}

export interface UnifiedItemSearchResponse {
  items: UnifiedItemSearchResult[];
  count: number;
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

export type ScanHistoryEventType =
  | "location_update"
  | "unknown_position"
  | "sold_terminal";

export type ScanHistoryPriceTerminalType =
  | "unknown_position"
  | "sold_terminal"
  | "price_update";

export interface LinkHistoryItemResponse {
  id: string;
  shopId: string;
  userId: string | null;
  username: string;
  productId: string;
  itemCategory: string | null;
  itemSku: string | null;
  itemBarcode: string | null;
  itemType: ScannerItemIdType;
  itemTitle: string;
  itemImageUrl: string | null;
  itemHeight: number | null;
  itemWidth: number | null;
  itemDepth: number | null;
  volume: number | null;
  lastModifiedAt: string;
  events: Array<{
    username: string;
    eventType: ScanHistoryEventType;
    orderId: string | null;
    orderGroupId: string | null;
    location: string;
    happenedAt: string;
  }>;
  priceHistory: Array<{
    price: string | null;
    terminalType: ScanHistoryPriceTerminalType | null;
    orderId: string | null;
    orderGroupId: string | null;
    happenedAt: string;
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
