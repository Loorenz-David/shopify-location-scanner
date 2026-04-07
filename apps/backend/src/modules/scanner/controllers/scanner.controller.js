import { GetScanHistoryQuerySchema } from "../contracts/scan-history.contract.js";
import { getScanHistoryQuery } from "../queries/get-scan-history.query.js";
export const scannerController = {
    getHistory: async (req, res) => {
        const query = GetScanHistoryQuerySchema.parse({
            page: req.query.page,
            q: req.query.q,
        });
        const history = await getScanHistoryQuery({
            shopId: req.authUser.shopId,
            page: query.page,
            ...(query.q ? { q: query.q } : {}),
        });
        res.status(200).json({ history });
    },
};
//# sourceMappingURL=scanner.controller.js.map