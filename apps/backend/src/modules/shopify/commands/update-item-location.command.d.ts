import type { ShopifyProductLocationDto, UpdateItemLocationInput } from "../contracts/shopify.contract.js";
import type { ScanHistoryRecord } from "../../scanner/domain/scan-history.js";
export declare const updateItemLocationCommand: (input: {
    shopId: string;
    userId: string;
    resolvedProductId: string;
    originalItemId: string;
    idType: "product_id" | "handle" | "sku" | "barcode";
    payload: UpdateItemLocationInput;
}) => Promise<{
    product: ShopifyProductLocationDto & {
        previousLocation: string | null;
    };
    historyItem: ScanHistoryRecord;
}>;
//# sourceMappingURL=update-item-location.command.d.ts.map