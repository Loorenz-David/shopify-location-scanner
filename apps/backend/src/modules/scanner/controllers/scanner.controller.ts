import type { Request, Response } from "express";
import {
  GetScanHistoryItemQuerySchema,
  GetScanHistoryItemParamsSchema,
  GetScanHistoryQuerySchema,
} from "../contracts/scan-history.contract.js";
import { getScanHistoryQuery } from "../queries/get-scan-history.query.js";
import { getScanHistoryItemQuery } from "../queries/get-scan-history-item.query.js";

export const scannerController = {
  getHistoryItemByQuery: async (req: Request, res: Response): Promise<void> => {
    const query = GetScanHistoryItemQuerySchema.parse({
      productId: req.query.productId,
    });

    const item = await getScanHistoryItemQuery({
      shopId: req.authUser.shopId as string,
      productId: query.productId,
    });

    res.status(200).json({ item });
  },

  getHistoryItem: async (req: Request, res: Response): Promise<void> => {
    const params = GetScanHistoryItemParamsSchema.parse({
      productId: req.params.productId,
    });

    const item = await getScanHistoryItemQuery({
      shopId: req.authUser.shopId as string,
      productId: params.productId,
    });

    res.status(200).json({ item });
  },

  getHistory: async (req: Request, res: Response): Promise<void> => {
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
      cursor: req.query.cursor,
    });

    const history = await getScanHistoryQuery({
      shopId: req.authUser.shopId as string,
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
      ...(query.cursor ? { cursor: query.cursor } : {}),
    });

    res.status(200).json({ history });
  },
};
