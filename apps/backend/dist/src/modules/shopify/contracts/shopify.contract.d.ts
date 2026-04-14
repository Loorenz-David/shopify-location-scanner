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
export declare const ShopifyOrdersPaidWebhookPayloadSchema: z.ZodObject<{
    id: z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>;
    processed_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    created_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    updated_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    source_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    app_id: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    note_attributes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        value: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>>;
    line_items: z.ZodArray<z.ZodObject<{
        id: z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>;
        product_id: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>>;
        sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        barcode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        price: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        title: z.ZodString;
        quantity: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ShopifyProductsUpdateWebhookPayloadSchema: z.ZodObject<{
    id: z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>;
    updated_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    variants: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>;
        price: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        barcode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>>;
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
export type ShopifyOrdersPaidWebhookPayload = z.infer<typeof ShopifyOrdersPaidWebhookPayloadSchema>;
export type ShopifyProductsUpdateWebhookPayload = z.infer<typeof ShopifyProductsUpdateWebhookPayloadSchema>;
export type ShopifyProductLocationDto = {
    id: string;
    title: string;
    itemCategory: string | null;
    barcode: string | null;
    price: string | null;
    itemHeight: number | null;
    itemWidth: number | null;
    itemDepth: number | null;
    volume: number | null;
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