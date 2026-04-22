import { outboundWebhookTargetRepository } from "../repositories/outbound-webhook-target.repository.js";
import type { OutboundWebhookTargetDto } from "../contracts/outbound-webhook.contract.js";

export const listOutboundTargetsQuery = async (input: {
  shopId: string;
}): Promise<OutboundWebhookTargetDto[]> =>
  outboundWebhookTargetRepository.listByShop(input.shopId);
