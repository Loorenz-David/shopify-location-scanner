import { z } from "zod";
export const InstallShopInputSchema = z
    .object({
    shopDomain: z
        .string()
        .trim()
        .regex(/^[a-zA-Z0-9-]+\.myshopify\.com$/)
        .optional(),
    storeName: z
        .string()
        .trim()
        .regex(/^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)$/)
        .optional(),
})
    .superRefine((value, ctx) => {
    if (!value.shopDomain && !value.storeName) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Either shopDomain or storeName is required",
            path: ["shopDomain"],
        });
    }
});
export const ShopifyCallbackQuerySchema = z.object({
    code: z.string().min(1),
    hmac: z.string().min(1),
    shop: z.string().regex(/^[a-zA-Z0-9-]+\.myshopify\.com$/),
    state: z.string().min(1),
    timestamp: z.string().min(1),
});
export const UpdateItemLocationInputSchema = z.object({
    location: z.string().trim().min(1).max(120),
});
export const ResolveItemIdTypeSchema = z.enum([
    "product_id",
    "handle",
    "sku",
    "barcode",
]);
export const UpdateItemLocationByIdentifierSchema = z.object({
    idType: ResolveItemIdTypeSchema,
    itemId: z.string().trim().min(1),
    location: z.string().trim().min(1).max(120),
});
export const UpdateItemLocationByIdentifierBatchSchema = z.object({
    items: z.array(UpdateItemLocationByIdentifierSchema).min(1).max(200),
});
export const QueryBySkuSchema = z.object({
    sku: z.string().trim().min(1),
});
export const SetMetafieldOptionsInputSchema = z.object({
    options: z.array(z.string().trim().min(1).max(120)).min(1).max(200),
});
export const AppendMetafieldOptionsInputSchema = z.object({
    options: z.array(z.string().trim().min(1).max(120)).min(1).max(200),
});
export const RemoveMetafieldOptionParamsSchema = z.object({
    optionValue: z.string().trim().min(1).max(120),
});
const ShopifyOrderLineItemSchema = z.object({
    id: z.union([z.number().int().positive(), z.string().trim().min(1)]),
    product_id: z
        .union([z.number().int().positive(), z.string().trim().min(1)])
        .nullable()
        .optional(),
    sku: z.string().trim().nullable().optional(),
    barcode: z.string().trim().nullable().optional(),
    price: z.string().trim().nullable().optional(),
    title: z.string().trim().min(1),
    quantity: z.number().int().min(1).optional(),
});
const ShopifyNoteAttributeSchema = z.object({
    name: z.string().trim().min(1),
    value: z.string().trim().nullable().optional(),
});
export const ShopifyOrdersPaidWebhookPayloadSchema = z.object({
    id: z.union([z.number().int().positive(), z.string().trim().min(1)]),
    processed_at: z.string().trim().nullable().optional(),
    created_at: z.string().trim().nullable().optional(),
    updated_at: z.string().trim().nullable().optional(),
    source_name: z.string().trim().nullable().optional(),
    app_id: z.number().int().nullable().optional(),
    note_attributes: z.array(ShopifyNoteAttributeSchema).optional(),
    line_items: z.array(ShopifyOrderLineItemSchema),
});
const ShopifyProductUpdateVariantSchema = z.object({
    id: z.union([z.number().int().positive(), z.string().trim().min(1)]),
    price: z.string().trim().nullable().optional(),
    sku: z.string().trim().nullable().optional(),
    barcode: z.string().trim().nullable().optional(),
});
export const ShopifyProductsUpdateWebhookPayloadSchema = z.object({
    id: z.union([z.number().int().positive(), z.string().trim().min(1)]),
    updated_at: z.string().trim().nullable().optional(),
    variants: z.array(ShopifyProductUpdateVariantSchema).optional(),
});
//# sourceMappingURL=shopify.contract.js.map