import { z } from "zod";

export const OUTBOUND_EVENT_TYPES = ["item_placed"] as const;
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
