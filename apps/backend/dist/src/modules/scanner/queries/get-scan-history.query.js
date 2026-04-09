import { scanHistoryRepository } from "../repositories/scan-history.repository.js";
const PAGE_SIZE = 50;
export const getScanHistoryQuery = async (input) => {
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
        ...(input.from ? { from: input.from } : {}),
        ...(input.to ? { to: input.to } : {}),
    });
};
//# sourceMappingURL=get-scan-history.query.js.map