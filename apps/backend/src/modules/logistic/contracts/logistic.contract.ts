import { z } from "zod";

export const LogisticIntentionSchema = z.enum([
  "customer_took_it",
  "store_pickup",
  "local_delivery",
  "international_shipping",
]);

export const LogisticEventTypeSchema = z.enum([
  "marked_intention",
  "placed",
  "fulfilled",
]);

export const LogisticZoneTypeSchema = z.enum([
  "for_delivery",
  "for_pickup",
  "for_fixing",
]);

export const MarkIntentionInputSchema = z.object({
  scanHistoryId: z.string().min(1),
  intention: LogisticIntentionSchema,
  fixItem: z.boolean(),
  fixNotes: z.string().trim().max(500).optional(),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be yyyy-mm-dd")
    .optional()
    .transform((v) => (v ? new Date(v) : undefined))
    .refine(
      (v) => v === undefined || !isNaN(v.getTime()),
      "scheduledDate is not a valid calendar date",
    ),
});

export const MarkPlacementInputSchema = z.object({
  scanHistoryId: z.string().min(1),
  logisticLocationId: z.string().min(1),
});

export const FulfilItemInputSchema = z.object({
  scanHistoryId: z.string().min(1),
});

export const MarkItemFixedInputSchema = z.object({
  scanHistoryId: z.string().min(1),
});

export const UpdateFixNotesInputSchema = z.object({
  fixNotes: z.string().trim().max(500).nullable(),
});

export const GetLogisticItemsQuerySchema = z.object({
  fixItem: z.preprocess(
    (v) => (v === "true" ? true : v === "false" ? false : v),
    z.boolean().optional(),
  ),
  isItemFixed: z.preprocess(
    (v) => (v === "true" ? true : v === "false" ? false : v),
    z.boolean().optional(),
  ),
  lastLogisticEventType: LogisticEventTypeSchema.optional(),
  zoneType: LogisticZoneTypeSchema.optional(),
  intention: LogisticIntentionSchema.optional(),
  orderId: z.string().optional(),
  ids: z.string().optional(), // comma-separated scanHistory IDs for targeted refetch
  noIntention: z
    .preprocess((v) => v === "true" || v === true, z.boolean())
    .optional(),
});

export const CreateLogisticLocationInputSchema = z.object({
  location: z.string().trim().min(1).max(120),
  zoneType: LogisticZoneTypeSchema,
});

export const UpdateLogisticLocationInputSchema = z
  .object({
    location: z.string().trim().min(1).max(120).optional(),
    zoneType: LogisticZoneTypeSchema.optional(),
  })
  .refine((v) => v.location !== undefined || v.zoneType !== undefined, {
    message: "At least one of location or zoneType must be provided",
  });

export const GetLogisticLocationsQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  zoneType: LogisticZoneTypeSchema.optional(),
});

export type MarkIntentionInput = z.infer<typeof MarkIntentionInputSchema>;
export type MarkPlacementInput = z.infer<typeof MarkPlacementInputSchema>;
export type FulfilItemInput = z.infer<typeof FulfilItemInputSchema>;
export type GetLogisticItemsQuery = z.infer<typeof GetLogisticItemsQuerySchema>;
export type CreateLogisticLocationInput = z.infer<
  typeof CreateLogisticLocationInputSchema
>;
export type UpdateLogisticLocationInput = z.infer<
  typeof UpdateLogisticLocationInputSchema
>;
export type GetLogisticLocationsQuery = z.infer<
  typeof GetLogisticLocationsQuerySchema
>;

export type LogisticZoneType = z.infer<typeof LogisticZoneTypeSchema>;
export type UpdateFixNotesInput = z.infer<typeof UpdateFixNotesInputSchema>;

// Response DTO — shape returned by all location endpoints and bootstrap
export type LogisticLocationDto = {
  id: string;
  shopId: string;
  location: string;
  zoneType: LogisticZoneType;
  createdAt: Date;
};

// Push subscription management
export const SavePushSubscriptionInputSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export const DeletePushSubscriptionInputSchema = z.object({
  endpoint: z.string().url(),
});

export type SavePushSubscriptionInput = z.infer<
  typeof SavePushSubscriptionInputSchema
>;
export type DeletePushSubscriptionInput = z.infer<
  typeof DeletePushSubscriptionInputSchema
>;
