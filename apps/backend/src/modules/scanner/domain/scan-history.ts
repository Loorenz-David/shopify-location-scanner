export type ScanHistoryEvent = {
  username: string;
  location: string;
  happenedAt: Date;
};

export type ScanHistoryRecord = {
  id: string;
  shopId: string;
  userId: string | null;
  username: string;
  productId: string;
  itemSku: string | null;
  itemImageUrl: string | null;
  itemType: string;
  itemTitle: string;
  lastModifiedAt: Date;
  events: ScanHistoryEvent[];
  createdAt: Date;
  updatedAt: Date;
};

export type ScanHistoryPage = {
  items: ScanHistoryRecord[];
  page: number;
  pageSize: number;
  total: number;
};
