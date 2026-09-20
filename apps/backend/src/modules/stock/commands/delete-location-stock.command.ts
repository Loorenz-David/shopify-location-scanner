import { NotFoundError } from "../../../shared/errors/http-errors.js";
import { locationStockRepository } from "../repositories/location-stock.repository.js";
import { reconcileCategory } from "../services/stock-reconciliation.service.js";
import { signalStockChanged } from "../../outbound-webhook/manager/manager-signals.js";

export const deleteLocationStockCommand = async (input: {
  id: string;
  shopId: string;
}): Promise<void> => {
  const existing = await locationStockRepository.findById(input.id, input.shopId);
  if (!existing) {
    throw new NotFoundError("Location stock not found");
  }

  await locationStockRepository.deleteById(input.id, input.shopId);
  await reconcileCategory(input.shopId, existing.itemCategory);

  // §12A.10: the identity may now be held by no location at all, which is what
  // the next sync turns into a delete (§12A.3) — never decided here.
  signalStockChanged(input.shopId);
};
