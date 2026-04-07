import type { ScanHistoryPage } from "../domain/scan-history.js";
import { scanHistoryRepository } from "../repositories/scan-history.repository.js";

const PAGE_SIZE = 50;

export const getScanHistoryQuery = async (input: {
  shopId: string;
  page: number;
  q?: string;
}): Promise<ScanHistoryPage> => {
  return scanHistoryRepository.listByShopPaginated({
    shopId: input.shopId,
    page: input.page,
    pageSize: PAGE_SIZE,
    ...(input.q ? { q: input.q } : {}),
  });
};
