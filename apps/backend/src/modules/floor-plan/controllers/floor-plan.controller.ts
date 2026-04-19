import type { Request, Response } from "express";
import { ValidationError } from "../../../shared/errors/http-errors.js";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { createFloorPlanCommand } from "../commands/create-floor-plan.command.js";
import { deleteFloorPlanCommand } from "../commands/delete-floor-plan.command.js";
import { updateFloorPlanCommand } from "../commands/update-floor-plan.command.js";
import {
  CreateFloorPlanSchema,
  UpdateFloorPlanSchema,
} from "../contracts/floor-plan.contract.js";
import { getFloorPlanQuery } from "../queries/get-floor-plan.query.js";
import { getFloorPlansQuery } from "../queries/get-floor-plans.query.js";

const getRequiredIdParam = (value: unknown): string => {
  if (!value || typeof value !== "string" || !value.trim()) {
    throw new ValidationError("Floor plan id path parameter is required");
  }

  return value.trim();
};

export const listFloorPlansController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const data = await getFloorPlansQuery(shopId);
    res.status(200).json({ data });
  },
);

export const getFloorPlanController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const id = getRequiredIdParam(req.params.id);
    const data = await getFloorPlanQuery(id, shopId);
    res.status(200).json({ data });
  },
);

export const createFloorPlanController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const body = CreateFloorPlanSchema.parse(req.body);
    const data = await createFloorPlanCommand(shopId, body);
    res.status(201).json({ data });
  },
);

export const updateFloorPlanController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const id = getRequiredIdParam(req.params.id);
    const body = UpdateFloorPlanSchema.parse(req.body);
    const data = await updateFloorPlanCommand(id, shopId, body);
    res.status(200).json({ data });
  },
);

export const deleteFloorPlanController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const id = getRequiredIdParam(req.params.id);
    await deleteFloorPlanCommand(id, shopId);
    res.status(200).json({ ok: true });
  },
);
