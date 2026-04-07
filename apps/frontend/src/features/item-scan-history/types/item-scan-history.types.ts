export interface ItemScanHistoryEvent {
  id: string;
  location: string;
  happenedAt: string;
  happenedAtLabel: string;
  username: string;
}

export interface ItemScanHistoryItem {
  id: string;
  skuLabel: string;
  title: string;
  imageUrl: string | null;
  productId: string;
  itemType: "product_id" | "handle" | "sku";
  lastModifiedAt: string;
  lastModifiedLabel: string;
  latestLocationLabel: string;
  latestUsername: string;
  events: ItemScanHistoryEvent[];
}
