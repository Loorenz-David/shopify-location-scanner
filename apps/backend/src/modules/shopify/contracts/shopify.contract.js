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
export const ResolveItemIdTypeSchema = z.enum(["product_id", "handle", "sku"]);
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
//# sourceMappingURL=shopify.contract.js.map