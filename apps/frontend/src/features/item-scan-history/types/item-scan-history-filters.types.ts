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
  from: string;
  to: string;
}
