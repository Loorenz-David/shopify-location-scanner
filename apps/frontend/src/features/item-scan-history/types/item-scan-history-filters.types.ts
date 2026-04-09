import type { SalesChannel } from "../../analytics/types/analytics.types";

export type ItemScanHistorySearchField =
  | "sku"
  | "barcode"
  | "location"
  | "itemTitle"
  | "itemCategory"
  | "username";

export type ItemScanHistoryStatusFilter = "active" | "sold";

export interface ItemScanHistoryFilters {
  selectedFields: ItemScanHistorySearchField[];
  includeLocationHistory: boolean;
  status: ItemScanHistoryStatusFilter;
  salesChannel?: SalesChannel;
  from: string;
  to: string;
}
