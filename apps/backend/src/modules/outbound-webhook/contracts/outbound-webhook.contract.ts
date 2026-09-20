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

export const OUTBOUND_DELIVERY_STATUSES = [
  "pending",
  "delivered",
  "rejected",
  "failed",
  "skipped",
] as const;
export const OutboundDeliveryStatusSchema = z.enum(OUTBOUND_DELIVERY_STATUSES);
export type OutboundDeliveryStatus = z.infer<typeof OutboundDeliveryStatusSchema>;

export const MANAGER_STOCK_LEDGER_STATES = ["active", "deleted"] as const;
export const ManagerStockLedgerStateSchema = z.enum(MANAGER_STOCK_LEDGER_STATES);
export type ManagerStockLedgerState = z.infer<typeof ManagerStockLedgerStateSchema>;

/**
 * Manager's answers (handoff v2 §3.4, §4.3, §4A.3), validated on the whole body.
 * `passthrough` keeps the echoed `itemCategory`/`properties` fields out of the
 * way: §12A.8 says they are ignored, not rejected.
 */
const managerEnvelope = <T extends z.ZodTypeAny>(result: T) =>
  z.object({ data: z.object({ results: z.array(result) }) });

export const ManagerDemandResponseSchema = managerEnvelope(
  z.object({ outcome: z.enum(["applied", "category_not_found"]) }).passthrough(),
);
export const ManagerDeleteResponseSchema = managerEnvelope(
  z.object({ outcome: z.enum(["deleted", "not_found", "category_not_found"]) }).passthrough(),
);
export const ManagerProcessedResponseSchema = managerEnvelope(
  z.union([
    z
      .object({
        outcome: z.literal("resolved"),
        reason: z.union([z.null(), z.literal("early")]),
      })
      .passthrough(),
    z
      .object({
        outcome: z.literal("ignored"),
        reason: z.enum(["item_not_found", "no_open_assignment"]),
      })
      .passthrough(),
  ]),
);

export const DeliveryQuerySchema = z.object({
  eventType: OutboundEventTypeSchema.optional(),
  status: OutboundDeliveryStatusSchema.optional(),
  subject: z.string().optional(),
  since: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type DeliveryQuery = z.infer<typeof DeliveryQuerySchema>;

export const ManagerStockQuerySchema = z.object({
  state: ManagerStockLedgerStateSchema.optional(),
  outcome: z.string().trim().min(1).optional(),
});
export type ManagerStockQuery = z.infer<typeof ManagerStockQuerySchema>;

/**
 * §12A.9. The log never stores `OutboundWebhookTarget.secret`, so every field
 * here is safe to return from the admin endpoints.
 */
export type OutboundWebhookDeliveryRecord = {
  id: string;
  shopId: string;
  targetId: string | null;
  eventType: OutboundEventType;
  subjectKey: string | null;
  status: OutboundDeliveryStatus;
  attempts: number;
  requestBody: string;
  responseStatus: number | null;
  responseBody: string | null;
  lastError: string | null;
  createdAt: Date;
  lastAttemptAt: Date | null;
  completedAt: Date | null;
};

/** §12A.3. `properties` is the object last sent, kept so a delete can be built. */
export type ManagerStockLedgerRecord = {
  id: string;
  shopId: string;
  itemCategory: string;
  propertiesCanonical: string;
  properties: unknown;
  state: ManagerStockLedgerState;
  lastSentQuantity: number | null;
  lastAppliedQuantity: number | null;
  lastOutcome: string | null;
  lastSentAt: Date | null;
  lastDeliveryId: string | null;
  createdAt: Date;
  updatedAt: Date;
};
