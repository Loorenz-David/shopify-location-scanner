import type { ScanHistoryPage } from "../domain/scan-history.js";
import type { ScanHistoryStringFilterColumn } from "../contracts/scan-history.contract.js";
import { scanHistoryRepository } from "../repositories/scan-history.repository.js";

const PAGE_SIZE = 50;

export const getScanHistoryQuery = async (input: {
  shopId: string;
  page: number;
  q?: string;
  includeLocationHistory?: boolean;
  stringColumns?: ScanHistoryStringFilterColumn[];
  sold?: boolean;
  inStore?: boolean;
  salesChannel?: "webshop" | "physical" | "imported" | "unknown";
  from?: Date;
  to?: Date;
  cursor?: string;
}): Promise<ScanHistoryPage> => {
  return scanHistoryRepository.listByShopPaginated({
    shopId: input.shopId,
    page: input.page,
    pageSize: PAGE_SIZE,
    ...(input.q ? { q: input.q } : {}),
    ...(input.includeLocationHistory
      ? { includeLocationHistory: input.includeLocationHistory }
      : {}),
    ...(input.stringColumns ? { stringColumns: input.stringColumns } : {}),
    ...(typeof input.sold === "boolean" ? { sold: input.sold } : {}),
    ...(typeof input.inStore === "boolean" ? { inStore: input.inStore } : {}),
    ...(input.salesChannel ? { salesChannel: input.salesChannel } : {}),
    ...(input.from ? { from: input.from } : {}),
    ...(input.to ? { to: input.to } : {}),
    ...(input.cursor ? { cursor: input.cursor } : {}),
  });
};
