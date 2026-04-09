import { GetScanHistoryItemQuerySchema, GetScanHistoryItemParamsSchema, GetScanHistoryQuerySchema, } from "../contracts/scan-history.contract.js";
import { getScanHistoryQuery } from "../queries/get-scan-history.query.js";
import { getScanHistoryItemQuery } from "../queries/get-scan-history-item.query.js";
export const scannerController = {
    getHistoryItemByQuery: async (req, res) => {
        const query = GetScanHistoryItemQuerySchema.parse({
            productId: req.query.productId,
        });
        const item = await getScanHistoryItemQuery({
            shopId: req.authUser.shopId,
            productId: query.productId,
        });
        res.status(200).json({ item });
    },
    getHistoryItem: async (req, res) => {
        const params = GetScanHistoryItemParamsSchema.parse({
            productId: req.params.productId,
        });
        const item = await getScanHistoryItemQuery({
            shopId: req.authUser.shopId,
            productId: params.productId,
        });
        res.status(200).json({ item });
    },
    getHistory: async (req, res) => {
        const query = GetScanHistoryQuerySchema.parse({
            page: req.query.page,
            q: req.query.q,
            fields: req.query.fields,
            status: req.query.status,
            includeLocationHistory: req.query.includeLocationHistory,
            stringColumns: req.query.stringColumns,
            sold: req.query.sold,
            inStore: req.query.inStore,
            salesChannel: req.query.salesChannel,
            from: req.query.from,
            to: req.query.to,
        });
        const history = await getScanHistoryQuery({
            shopId: req.authUser.shopId,
            page: query.page,
            ...(query.q ? { q: query.q } : {}),
            ...(query.includeLocationHistory
                ? { includeLocationHistory: query.includeLocationHistory }
                : {}),
            ...(query.stringColumns ? { stringColumns: query.stringColumns } : {}),
            ...(typeof query.sold === "boolean" ? { sold: query.sold } : {}),
            ...(typeof query.inStore === "boolean" ? { inStore: query.inStore } : {}),
            ...(query.salesChannel ? { salesChannel: query.salesChannel } : {}),
            ...(query.from ? { from: query.from } : {}),
            ...(query.to ? { to: query.to } : {}),
        });
        res.status(200).json({ history });
    },
};
//# sourceMappingURL=scanner.controller.js.map