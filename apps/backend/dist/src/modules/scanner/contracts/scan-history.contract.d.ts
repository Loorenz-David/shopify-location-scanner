import { z } from "zod";
declare const ScanHistoryStringFilterColumnSchema: z.ZodEnum<{
    username: "username";
    productId: "productId";
    itemCategory: "itemCategory";
    itemSku: "itemSku";
    itemBarcode: "itemBarcode";
    itemType: "itemType";
    itemTitle: "itemTitle";
    eventUsername: "eventUsername";
    eventLocation: "eventLocation";
}>;
export declare const AppendScanLocationHistorySchema: z.ZodObject<{
    shopId: z.ZodString;
    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    username: z.ZodString;
    eventType: z.ZodOptional<z.ZodEnum<{
        location_update: "location_update";
        unknown_position: "unknown_position";
        sold_terminal: "sold_terminal";
    }>>;
    currentPrice: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    itemHeight: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    itemWidth: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    itemDepth: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    volume: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    productId: z.ZodString;
    itemCategory: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    itemSku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    itemBarcode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    itemImageUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    itemType: z.ZodString;
    itemTitle: z.ZodString;
    location: z.ZodString;
    happenedAt: z.ZodOptional<z.ZodDate>;
}, z.core.$strip>;
export declare const GetScanHistoryQuerySchema: z.ZodPipe<z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    q: z.ZodOptional<z.ZodString>;
    fields: z.ZodPipe<z.ZodTransform<string[] | undefined, unknown>, z.ZodOptional<z.ZodArray<z.ZodEnum<{
        username: "username";
        itemCategory: "itemCategory";
        itemTitle: "itemTitle";
        location: "location";
        sku: "sku";
        barcode: "barcode";
    }>>>>;
    status: z.ZodDefault<z.ZodEnum<{
        active: "active";
        sold: "sold";
    }>>;
    stringColumns: z.ZodPipe<z.ZodTransform<string[] | undefined, unknown>, z.ZodOptional<z.ZodArray<z.ZodEnum<{
        username: "username";
        productId: "productId";
        itemCategory: "itemCategory";
        itemSku: "itemSku";
        itemBarcode: "itemBarcode";
        itemType: "itemType";
        itemTitle: "itemTitle";
        eventUsername: "eventUsername";
        eventLocation: "eventLocation";
    }>>>>;
    sold: z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>;
    inStore: z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodBoolean>>;
    from: z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodCoercedDate<unknown>>>;
    to: z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodOptional<z.ZodCoercedDate<unknown>>>;
}, z.core.$strip>, z.ZodTransform<{
    page: number;
    q: string | undefined;
    fields: ("username" | "itemCategory" | "itemTitle" | "location" | "sku" | "barcode")[] | undefined;
    status: "active" | "sold";
    stringColumns: ("username" | "productId" | "itemCategory" | "itemSku" | "itemBarcode" | "itemType" | "itemTitle" | "eventUsername" | "eventLocation")[] | undefined;
    sold: boolean | undefined;
    inStore: boolean | undefined;
    from: Date | undefined;
    to: Date | undefined;
}, {
    page: number;
    status: "active" | "sold";
    q?: string | undefined;
    fields?: ("username" | "itemCategory" | "itemTitle" | "location" | "sku" | "barcode")[] | undefined;
    stringColumns?: ("username" | "productId" | "itemCategory" | "itemSku" | "itemBarcode" | "itemType" | "itemTitle" | "eventUsername" | "eventLocation")[] | undefined;
    sold?: boolean | undefined;
    inStore?: boolean | undefined;
    from?: Date | undefined;
    to?: Date | undefined;
}>>;
export type ScanHistoryStringFilterColumn = z.infer<typeof ScanHistoryStringFilterColumnSchema>;
export type AppendScanLocationHistoryInput = z.infer<typeof AppendScanLocationHistorySchema>;
export type GetScanHistoryQueryInput = z.infer<typeof GetScanHistoryQuerySchema>;
export {};
//# sourceMappingURL=scan-history.contract.d.ts.map