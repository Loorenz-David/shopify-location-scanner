import type {
  DeliveryQuery,
  OutboundWebhookDeliveryRecord,
} from "../contracts/outbound-webhook.contract.js";
import { outboundDeliveryRepository } from "../repositories/outbound-delivery.repository.js";

/**
 * §12A.9 / §8: "was article X reported, when, and what did Manager say", and
 * "which deliveries failed or were rejected in the last N days, and why".
 * Every stored field is returned; none of them can hold the target's secret.
 */
export const listDeliveriesQuery = async (
  input: { shopId: string } & DeliveryQuery,
): Promise<OutboundWebhookDeliveryRecord[]> => outboundDeliveryRepository.list(input);
