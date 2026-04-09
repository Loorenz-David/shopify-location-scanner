import { GetScanHistoryQuerySchema } from "../contracts/scan-history.contract.js";
import { getScanHistoryQuery } from "../queries/get-scan-history.query.js";
export const scannerController = {
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
            ...(query.from ? { from: query.from } : {}),
            ...(query.to ? { to: query.to } : {}),
        });
        res.status(200).json({ history });
    },
};
//# sourceMappingURL=scanner.controller.js.map