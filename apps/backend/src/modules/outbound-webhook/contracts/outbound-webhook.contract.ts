import { z } from "zod";

export const OUTBOUND_EVENT_TYPES = ["item_placed", "stock_demand", "stock_demand_deleted", "items_processed"] as const;
export const OutboundEventTypeSchema = z.enum(OUTBOUND_EVENT_TYPES);

export const RegisterOutboundTargetInputSchema = z.object({
  label: z.string().trim().min(2).max(80),
  targetUrl: z.string().url(),
  secret: z.string().min(16),
  eventType: OutboundEventTypeSchema,
});

export const OutboundWebhookTargetParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const SetOutboundTargetActiveInputSchema = z.object({
  active: z.boolean(),
});

export type OutboundEventType = z.infer<typeof OutboundEventTypeSchema>;
export type RegisterOutboundTargetInput = z.infer<
  typeof RegisterOutboundTargetInputSchema
>;
export type OutboundWebhookTargetParams = z.infer<
  typeof OutboundWebhookTargetParamsSchema
>;
export type SetOutboundTargetActiveInput = z.infer<
  typeof SetOutboundTargetActiveInputSchema
>;

export type ItemPlacedPayload = {
  event: "item_placed";
  shopId: string;
  scanHistoryId: string;
  orderId: string | null;
  itemSku: string | null;
  logisticLocation: {
    id: string;
    location: string;
    updatedAt: string;
  };
};

export type OutboundWebhookTargetDto = {
  id: string;
  label: string;
  targetUrl: string;
  eventType: OutboundEventType;
  active: boolean;
  createdAt: Date;
};

const managerEnvelope = <T extends z.ZodTypeAny>(result: T) => z.object({ data: z.object({ results: z.array(result) }) });
export const ManagerDemandResponseSchema = managerEnvelope(z.object({ outcome: z.enum(["applied", "category_not_found"]) }).passthrough());
export const ManagerDeleteResponseSchema = managerEnvelope(z.object({ outcome: z.enum(["deleted", "not_found", "category_not_found"]) }).passthrough());
export const ManagerProcessedResponseSchema = managerEnvelope(z.union([
  z.object({ outcome: z.literal("resolved"), reason: z.union([z.null(), z.literal("early")]) }),
  z.object({ outcome: z.literal("ignored"), reason: z.enum(["item_not_found", "no_open_assignment"]) }),
]));
export const DeliveryQuerySchema = z.object({ eventType: OutboundEventTypeSchema.optional(), status: z.enum(["pending", "delivered", "rejected", "failed", "skipped"]).optional(), subject: z.string().optional(), since: z.coerce.date().optional(), limit: z.coerce.number().int().min(1).max(200).default(50) });
export const ManagerStockQuerySchema = z.object({ state: z.enum(["active", "deleted"]).optional(), outcome: z.string().optional() });
