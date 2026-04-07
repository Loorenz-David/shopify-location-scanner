import type { Request, Response } from "express";
import { GetScanHistoryQuerySchema } from "../contracts/scan-history.contract.js";
import { getScanHistoryQuery } from "../queries/get-scan-history.query.js";

export const scannerController = {
  getHistory: async (req: Request, res: Response): Promise<void> => {
    const query = GetScanHistoryQuerySchema.parse({
      page: req.query.page,
      q: req.query.q,
    });

    const history = await getScanHistoryQuery({
      shopId: req.authUser.shopId as string,
      page: query.page,
      ...(query.q ? { q: query.q } : {}),
    });

    res.status(200).json({ history });
  },
};
