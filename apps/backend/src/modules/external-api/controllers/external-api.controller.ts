import type { Request, Response } from "express";
import { ValidationError } from "../../../shared/errors/http-errors.js";
import { scheduleOrderItemsCommand } from "../commands/schedule-order-items.command.js";
import { ScheduleOrderItemsInputSchema } from "../contracts/external-api.contract.js";

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
};
