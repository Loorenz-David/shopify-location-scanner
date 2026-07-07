import type { Request, Response } from "express";
import { ValidationError } from "../../../shared/errors/http-errors.js";
import { scheduleOrderItemsCommand } from "../commands/schedule-order-items.command.js";
import { updateManagerAppItemsLocationCommand } from "../commands/update-manager-app-items-location.command.js";
import {
  ManagerAppGetItemsLocationQuerySchema,
  ManagerAppPatchItemsLocationInputSchema,
  ScheduleOrderItemsInputSchema,
} from "../contracts/external-api.contract.js";
import { getManagerAppItemsLocationQuery } from "../queries/get-manager-app-items-location.query.js";

export const externalApiController = {
  async scheduleOrderItems(req: Request, res: Response): Promise<void> {
    const parsed = ScheduleOrderItemsInputSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    const result = await scheduleOrderItemsCommand(parsed.data);

    res.status(200).json({
      ok: true,
      updated: result.updated,
    });
  },

  async getManagerAppItemsLocation(
    req: Request,
    res: Response,
  ): Promise<void> {
    const parsed = ManagerAppGetItemsLocationQuerySchema.safeParse({
      q: req.query.q,
      item_identity: req.query.item_identity,
    });

    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    const items = await getManagerAppItemsLocationQuery(parsed.data);

    res.status(200).json(items);
  },

  async updateManagerAppItemsLocation(
    req: Request,
    res: Response,
  ): Promise<void> {
    const parsed = ManagerAppPatchItemsLocationInputSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    const result = await updateManagerAppItemsLocationCommand(parsed.data);

    if (result.updated === 0) {
      throw new ValidationError("No item location updates succeeded", result);
    }

    res.status(result.failed > 0 ? 207 : 200).json(result);
  },
};
