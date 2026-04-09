import type { ScanHistoryPage } from "../domain/scan-history.js";
import type { ScanHistoryStringFilterColumn } from "../contracts/scan-history.contract.js";
export declare const getScanHistoryQuery: (input: {
    shopId: string;
    page: number;
    q?: string;
    stringColumns?: ScanHistoryStringFilterColumn[];
    sold?: boolean;
    inStore?: boolean;
    from?: Date;
    to?: Date;
}) => Promise<ScanHistoryPage>;
//# sourceMappingURL=get-scan-history.query.d.ts.map