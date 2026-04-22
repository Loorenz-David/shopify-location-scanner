import { NotFoundError } from "../../../shared/errors/http-errors.js";
import { outboundWebhookTargetRepository } from "../repositories/outbound-webhook-target.repository.js";

export const removeOutboundTargetCommand = async (input: {
  id: string;
  shopId: string;
}): Promise<void> => {
  const removed = await outboundWebhookTargetRepository.remove(input);

  if (!removed) {
    throw new NotFoundError("Outbound webhook target not found");
  }
};
