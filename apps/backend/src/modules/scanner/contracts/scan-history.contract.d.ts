import { z } from "zod";
export declare const AppendScanLocationHistorySchema: z.ZodObject<{
    shopId: z.ZodString;
    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    username: z.ZodString;
    productId: z.ZodString;
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