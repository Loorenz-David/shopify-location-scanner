import type { Request, Response } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { ValidationError } from "../../../shared/errors/http-errors.js";
import {
  CreateLocationStocksSchema,
  toLocationStockDto,
  UpdateLocationStockSchema,
} from "../contracts/stock.contract.js";
import { createLocationStocksCommand } from "../commands/create-location-stocks.command.js";
import { deleteLocationStockCommand } from "../commands/delete-location-stock.command.js";
import { updateLocationStockCommand } from "../commands/update-location-stock.command.js";
import { getLocationStockDetailQuery } from "../queries/get-location-stock-detail.query.js";
import { getStockConfigurationOptionsQuery } from "../queries/get-stock-configuration-options.query.js";
import { getStockLocationsSummaryQuery } from "../queries/get-stock-locations-summary.query.js";
import { getStockReportQuery } from "../queries/get-stock-report.query.js";

const getRequiredIdParam = (value: string | string[] | undefined): string => {
  if (!value || Array.isArray(value)) {
    throw new ValidationError("Location stock id path parameter is required");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ValidationError("Location stock id path parameter is required");
  }

  return trimmed;
};

const getRequiredLocationParam = (
  value: string | string[] | undefined,
): string => {
  if (!value || Array.isArray(value) || !value.trim()) {
    throw new ValidationError("Location path parameter is required");
  }
  return value;
};

export const getStockConfigurationOptionsController = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = getStockConfigurationOptionsQuery();
    res.status(200).json({ data });
  },
);

export const listStockLocationsController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const data = await getStockLocationsSummaryQuery(shopId);
    res.status(200).json({ data });
  },
);

export const getStockReportController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const data = await getStockReportQuery(shopId);
    res.status(200).json({ data });
  },
);

export const getLocationStockDetailController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const location = getRequiredLocationParam(req.params.location);
    const data = await getLocationStockDetailQuery(shopId, location);
    res.status(200).json({ data: data.map(toLocationStockDto) });
  },
);

export const createLocationStocksController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const body = CreateLocationStocksSchema.parse(req.body);
    const data = await createLocationStocksCommand({
      shopId,
      username: req.authUser.username,
      payload: body,
    });
    res.status(201).json({ data: data.map(toLocationStockDto) });
  },
);

export const updateLocationStockController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const id = getRequiredIdParam(req.params.id);
    const body = UpdateLocationStockSchema.parse(req.body);
    const data = await updateLocationStockCommand({
      id,
      shopId,
      username: req.authUser.username,
      payload: body,
    });
    res.status(200).json({ data: toLocationStockDto(data) });
  },
);

export const deleteLocationStockController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const id = getRequiredIdParam(req.params.id);
    await deleteLocationStockCommand({ id, shopId });
    res.status(200).json({ ok: true });
  },
);
