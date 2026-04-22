import { NotFoundError } from "../../../shared/errors/http-errors.js";
import { outboundWebhookTargetRepository } from "../repositories/outbound-webhook-target.repository.js";

export const setOutboundTargetActiveCommand = async (input: {
  id: string;
  shopId: string;
  active: boolean;
}): Promise<void> => {
  const updated = await outboundWebhookTargetRepository.setActive(input);

  if (!updated) {
    throw new NotFoundError("Outbound webhook target not found");
  }
};
