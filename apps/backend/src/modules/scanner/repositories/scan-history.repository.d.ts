import type { AppendScanLocationHistoryInput } from "../contracts/scan-history.contract.js";
import type { ScanHistoryPage, ScanHistoryRecord } from "../domain/scan-history.js";
export declare const scanHistoryRepository: {
    appendLocationEvent(input: AppendScanLocationHistoryInput): Promise<ScanHistoryRecord>;
    listByShopPaginated(input: {
        shopId: string;
        page: number;
        pageSize: number;
        q?: string;
    }): Promise<ScanHistoryPage>;
};
//# sourceMappingURL=scan-history.repository.d.ts.map