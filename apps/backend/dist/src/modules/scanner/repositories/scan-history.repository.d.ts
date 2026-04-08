import type { AppendScanLocationHistoryInput } from "../contracts/scan-history.contract.js";
import type { ScanHistoryPage, ScanHistoryRecord } from "../domain/scan-history.js";
export declare const scanHistoryRepository: {
    appendLocationEvent(input: AppendScanLocationHistoryInput): Promise<ScanHistoryRecord>;
    appendSoldTerminalEventWithFallback(input: {
        shopId: string;
        userId?: string | null;
        username: string;
        productId: string;
        itemSku?: string | null;
        itemBarcode?: string | null;
        itemImageUrl?: string | null;
        itemType: string;
        itemTitle: string;
        itemCategory?: string | null;
        soldPrice?: string | null;
        orderId?: string | null;
        orderGroupId?: string | null;
        unknownLocation: string;
        soldLocation: string;
        happenedAt?: Date;
    }): Promise<ScanHistoryRecord>;
    appendPriceChangeIfHistoryExists(input: {
        shopId: string;
        productId: string;
        price: string;
        happenedAt?: Date;
    }): Promise<boolean>;
    listByShopPaginated(input: {
        shopId: string;
        page: number;
        pageSize: number;
        q?: string;
    }): Promise<ScanHistoryPage>;
};
//# sourceMappingURL=scan-history.repository.d.ts.map