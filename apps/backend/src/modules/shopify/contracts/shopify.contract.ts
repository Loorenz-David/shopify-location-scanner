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

export type InstallShopInput = z.infer<typeof InstallShopInputSchema>;
export type ShopifyCallbackQuery = z.infer<typeof ShopifyCallbackQuerySchema>;
export type UpdateItemLocationInput = z.infer<
  typeof UpdateItemLocationInputSchema
>;
export type ResolveItemIdType = z.infer<typeof ResolveItemIdTypeSchema>;
export type UpdateItemLocationByIdentifierInput = z.infer<
  typeof UpdateItemLocationByIdentifierSchema
>;
export type UpdateItemLocationByIdentifierBatchInput = z.infer<
  typeof UpdateItemLocationByIdentifierBatchSchema
>;
export type QueryBySkuInput = z.infer<typeof QueryBySkuSchema>;
export type SetMetafieldOptionsInput = z.infer<
  typeof SetMetafieldOptionsInputSchema
>;
export type AppendMetafieldOptionsInput = z.infer<
  typeof AppendMetafieldOptionsInputSchema
>;
export type RemoveMetafieldOptionParams = z.infer<
  typeof RemoveMetafieldOptionParamsSchema
>;

export type ShopifyProductLocationDto = {
  id: string;
  title: string;
  location: string | null;
  updatedAt: string;
};

export type ShopifySkuSearchItemDto = {
  productId: string;
  title: string;
  imageUrl: string | null;
  sku: string;
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
