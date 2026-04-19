import type { Request, Response } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { ValidationError } from "../../../shared/errors/http-errors.js";
import {
  CreateZoneSchema,
  ReorderZonesSchema,
  UpdateZoneSchema,
} from "../contracts/zone.contract.js";
import { createZoneCommand } from "../commands/create-zone.command.js";
import { deleteZoneCommand } from "../commands/delete-zone.command.js";
import { reorderZonesCommand } from "../commands/reorder-zones.command.js";
import { updateZoneCommand } from "../commands/update-zone.command.js";
import { getZonesQuery } from "../queries/get-zones.query.js";

const getRequiredIdParam = (value: string | string[] | undefined): string => {
  if (!value || Array.isArray(value)) {
    throw new ValidationError("Zone id path parameter is required");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ValidationError("Zone id path parameter is required");
  }

  return trimmed;
};

export const listZonesController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const floorPlanId =
      typeof req.query.floorPlanId === "string"
        ? req.query.floorPlanId
        : undefined;
    const data = await getZonesQuery(shopId, floorPlanId);
    res.status(200).json({ data });
  },
);

export const createZoneController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const body = CreateZoneSchema.parse(req.body);
    const data = await createZoneCommand(shopId, body);
    res.status(201).json({ data });
  },
);

export const updateZoneController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const zoneId = getRequiredIdParam(req.params.id);
    const body = UpdateZoneSchema.parse(req.body);
    const data = await updateZoneCommand(zoneId, shopId, body);
    res.status(200).json({ data });
  },
);

export const deleteZoneController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const zoneId = getRequiredIdParam(req.params.id);
    await deleteZoneCommand(zoneId, shopId);
    res.status(200).json({ ok: true });
  },
);

export const reorderZonesController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const body = ReorderZonesSchema.parse(req.body);
    await reorderZonesCommand(shopId, body.zones);
    res.status(200).json({ ok: true });
  },
);
