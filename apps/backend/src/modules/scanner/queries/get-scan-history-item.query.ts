import { NotFoundError } from "../../../shared/errors/http-errors.js";
import type { ScanHistoryRecord } from "../domain/scan-history.js";
import { scanHistoryRepository } from "../repositories/scan-history.repository.js";

export const getScanHistoryItemQuery = async (input: {
  shopId: string;
  productId: string;
}): Promise<ScanHistoryRecord> => {
  const historyItem = await scanHistoryRepository.findByShopAndProduct({
    shopId: input.shopId,
    productId: input.productId,
  });

  if (!historyItem) {
    throw new NotFoundError("Scan history item not found");
  }

  return historyItem;
};
