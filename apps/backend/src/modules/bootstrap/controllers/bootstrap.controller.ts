import type { Request, Response } from "express";
import { buildBootstrapPayloadQuery } from "../queries/build-bootstrap-payload.query.js";

export const bootstrapController = {
  getPayload: async (req: Request, res: Response): Promise<void> => {
    const payload = await buildBootstrapPayloadQuery({
      shopId: req.authUser.shopId as string,
    });

    res.status(200).json({ payload });
  },
};
