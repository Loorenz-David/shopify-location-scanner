import { scanHistoryRepository } from "../repositories/scan-history.repository.js";
const PAGE_SIZE = 50;
export const getScanHistoryQuery = async (input) => {
    return scanHistoryRepository.listByShopPaginated({
        shopId: input.shopId,
        page: input.page,
        pageSize: PAGE_SIZE,
        ...(input.q ? { q: input.q } : {}),
    });
};
//# sourceMappingURL=get-scan-history.query.js.map