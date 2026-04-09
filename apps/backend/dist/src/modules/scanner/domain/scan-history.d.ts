export type ScanHistoryEventType = "location_update" | "unknown_position" | "sold_terminal";
export type ScanHistoryPriceTerminalType = "unknown_position" | "sold_terminal" | "price_update";
export type ScanHistoryEvent = {
    username: string;
    eventType: ScanHistoryEventType;
    orderId: string | null;
    orderGroupId: string | null;
    location: string;
    happenedAt: Date;
};
export type ScanHistoryPricePoint = {
    price: string | null;
    terminalType: ScanHistoryPriceTerminalType | null;
    orderId: string | null;
    orderGroupId: string | null;
    happenedAt: Date;
};
export type ScanHistoryRecord = {
    id: string;
    shopId: string;
    userId: string | null;
    username: string;
    productId: string;
    itemCategory: string | null;
    itemSku: string | null;
    itemBarcode: string | null;
    itemImageUrl: string | null;
    itemType: string;
    itemTitle: string;
    itemHeight: number | null;
    itemWidth: number | null;
    itemDepth: number | null;
    volume: number | null;
    latestLocation: string | null;
    lastModifiedAt: Date;
    events: ScanHistoryEvent[];
    priceHistory: ScanHistoryPricePoint[];
    createdAt: Date;
    updatedAt: Date;
};
export type ScanHistoryPage = {
    items: ScanHistoryRecord[];
    page: number;
    pageSize: number;
    total: number;
};
//# sourceMappingURL=scan-history.d.ts.map