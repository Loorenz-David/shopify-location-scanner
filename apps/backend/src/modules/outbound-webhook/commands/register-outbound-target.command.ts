import { ConflictError } from "../../../shared/errors/http-errors.js";
import { outboundWebhookTargetRepository } from "../repositories/outbound-webhook-target.repository.js";
import type { RegisterOutboundTargetInput } from "../contracts/outbound-webhook.contract.js";

export const registerOutboundTargetCommand = async (input: {
  shopId: string;
  payload: RegisterOutboundTargetInput;
}): Promise<{ id: string }> => {
  const existing = await outboundWebhookTargetRepository.findByShopUrlAndEvent({
    shopId: input.shopId,
    targetUrl: input.payload.targetUrl,
    eventType: input.payload.eventType,
  });

  if (existing?.active) {
    throw new ConflictError(
      "An active target already exists for this URL and event type",
    );
  }

  return outboundWebhookTargetRepository.upsert(input);
};
