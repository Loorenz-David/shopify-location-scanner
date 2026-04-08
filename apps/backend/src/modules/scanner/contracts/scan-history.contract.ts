import { z } from "zod";

export const AppendScanLocationHistorySchema = z.object({
  shopId: z.string().min(1),
  userId: z.string().min(1).nullable().optional(),
  username: z.string().trim().min(1).max(80),
  productId: z.string().trim().min(1),
  itemSku: z.string().trim().min(1).max(120).nullable().optional(),
  itemBarcode: z.string().trim().min(1).max(120).nullable().optional(),
  itemImageUrl: z.string().url().nullable().optional(),
  itemType: z.string().trim().min(1).max(40),
  itemTitle: z.string().trim().min(1).max(255),
  location: z.string().trim().min(1).max(120),
  happenedAt: z.date().optional(),
});

export const GetScanHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  q: z.string().trim().min(1).max(120).optional(),
});

export type AppendScanLocationHistoryInput = z.infer<
  typeof AppendScanLocationHistorySchema
>;
export type GetScanHistoryQueryInput = z.infer<
  typeof GetScanHistoryQuerySchema
>;
