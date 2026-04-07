import { z } from "zod";
export declare const InstallShopInputSchema: z.ZodObject<{
    shopDomain: z.ZodOptional<z.ZodString>;
    storeName: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ShopifyCallbackQuerySchema: z.ZodObject<{
    code: z.ZodString;
    hmac: z.ZodString;
    shop: z.ZodString;
    state: z.ZodString;
    timestamp: z.ZodString;
}, z.core.$strip>;
export declare const UpdateItemLocationInputSchema: z.ZodObject<{
    location: z.ZodString;
}, z.core.$strip>;
export declare const ResolveItemIdTypeSchema: z.ZodEnum<{
    product_id: "product_id";
    handle: "handle";
    sku: "sku";
    barcode: "barcode";
}>;
export declare const UpdateItemLocationByIdentifierSchema: z.ZodObject<{
    idType: z.ZodEnum<{
        product_id: "product_id";
        handle: "handle";
        sku: "sku";
        barcode: "barcode";
    }>;
    itemId: z.ZodString;
    location: z.ZodString;
}, z.core.$strip>;
export declare const UpdateItemLocationByIdentifierBatchSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        idType: z.ZodEnum<{
            product_id: "product_id";
            handle: "handle";
            sku: "sku";
            barcode: "barcode";
        }>;
        itemId: z.ZodString;
        location: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const QueryBySkuSchema: z.ZodObject<{
    sku: z.ZodString;
}, z.core.$strip>;
export declare const SetMetafieldOptionsInputSchema: z.ZodObject<{
    options: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const AppendMetafieldOptionsInputSchema: z.ZodObject<{
    options: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const RemoveMetafieldOptionParamsSchema: z.ZodObject<{
    optionValue: z.ZodString;
}, z.core.$strip>;
export type InstallShopInput = z.infer<typeof InstallShopInputSchema>;
export type ShopifyCallbackQuery = z.infer<typeof ShopifyCallbackQuerySchema>;
export type UpdateItemLocationInput = z.infer<typeof UpdateItemLocationInputSchema>;
export type ResolveItemIdType = z.infer<typeof ResolveItemIdTypeSchema>;
export type UpdateItemLocationByIdentifierInput = z.infer<typeof UpdateItemLocationByIdentifierSchema>;
export type UpdateItemLocationByIdentifierBatchInput = z.infer<typeof UpdateItemLocationByIdentifierBatchSchema>;
export type QueryBySkuInput = z.infer<typeof QueryBySkuSchema>;
export type SetMetafieldOptionsInput = z.infer<typeof SetMetafieldOptionsInputSchema>;
export type AppendMetafieldOptionsInput = z.infer<typeof AppendMetafieldOptionsInputSchema>;
export type RemoveMetafieldOptionParams = z.infer<typeof RemoveMetafieldOptionParamsSchema>;
export type ShopifyProductLocationDto = {
    id: string;
    title: string;
    barcode: string | null;
    location: string | null;
    updatedAt: string;
};
export type ShopifySkuSearchItemDto = {
    productId: string;
    title: string;
    imageUrl: string | null;
    sku: string;
    barcode: string | null;
};
export type ShopifyMetafieldOptionDto = {
    label: string;
    value: string;
};
export type ShopifyMetafieldOptionsDto = {
    namespace: string;
    key: string;
    type: string;
    options: ShopifyMetafieldOptionDto[];
};
export type ShopifyLinkedShopDto = {
    shopDomain: string;
    createdAt: string;
};
//# sourceMappingURL=shopify.contract.d.ts.map