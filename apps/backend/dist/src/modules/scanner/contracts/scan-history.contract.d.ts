import { z } from "zod";
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
export declare const GetScanHistoryQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    q: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type AppendScanLocationHistoryInput = z.infer<typeof AppendScanLocationHistorySchema>;
export type GetScanHistoryQueryInput = z.infer<typeof GetScanHistoryQuerySchema>;
//# sourceMappingURL=scan-history.contract.d.ts.map