import type { ScanHistoryPage } from "../domain/scan-history.js";
import type { ScanHistoryStringFilterColumn } from "../contracts/scan-history.contract.js";
import { scanHistoryRepository } from "../repositories/scan-history.repository.js";

const PAGE_SIZE = 50;

export const getScanHistoryQuery = async (input: {
  shopId: string;
  page: number;
  q?: string;
  stringColumns?: ScanHistoryStringFilterColumn[];
  sold?: boolean;
  inStore?: boolean;
  from?: Date;
  to?: Date;
}): Promise<ScanHistoryPage> => {
  return scanHistoryRepository.listByShopPaginated({
    shopId: input.shopId,
    page: input.page,
    pageSize: PAGE_SIZE,
    ...(input.q ? { q: input.q } : {}),
    ...(input.stringColumns ? { stringColumns: input.stringColumns } : {}),
    ...(typeof input.sold === "boolean" ? { sold: input.sold } : {}),
    ...(typeof input.inStore === "boolean" ? { inStore: input.inStore } : {}),
    ...(input.from ? { from: input.from } : {}),
    ...(input.to ? { to: input.to } : {}),
  });
};
