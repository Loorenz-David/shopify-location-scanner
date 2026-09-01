import { NotFoundError } from "../../../shared/errors/http-errors.js";
import { locationStockRepository } from "../repositories/location-stock.repository.js";
import { reconcileGroup } from "../services/stock-reconciliation.service.js";

export const deleteLocationStockCommand = async (input: {
  id: string;
  shopId: string;
}): Promise<void> => {
  const existing = await locationStockRepository.findById(input.id, input.shopId);
  if (!existing) {
    throw new NotFoundError("Location stock not found");
  }

  await locationStockRepository.deleteById(input.id, input.shopId);
  await reconcileGroup(input.shopId, existing.location, existing.itemCategory);
};
