import type { Request, Response } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { ValidationError } from "../../../shared/errors/http-errors.js";
import { DateRangeSchema } from "../contracts/stats.contract.js";
import {
  getCategoriesOverview,
  getDimensionsStats,
  getSalesChannelOverview,
  getSalesVelocity,
  getSmartInsights,
  getZoneDetail,
  getZonesOverview,
} from "../repositories/stats.repository.js";

export const getZonesOverviewController = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to } = DateRangeSchema.parse(req.query);
    const shopId = req.authUser.shopId as string;
    const data = await getZonesOverview(shopId, from, to);
    res.status(200).json({ data });
  },
);

export const getZoneDetailController = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to } = DateRangeSchema.parse(req.query);
    const shopId = req.authUser.shopId as string;
    const rawLocation = req.params.location;

    if (!rawLocation || Array.isArray(rawLocation)) {
      throw new ValidationError("Location path parameter is required");
    }

    const location = decodeURIComponent(rawLocation);
    const data = await getZoneDetail(shopId, location, from, to);
    res.status(200).json({
      data: {
        location,
        ...data,
      },
    });
  },
);

export const getCategoriesController = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to } = DateRangeSchema.parse(req.query);
    const shopId = req.authUser.shopId as string;
    const data = await getCategoriesOverview(shopId, from, to);
    res.status(200).json({ data });
  },
);

export const getDimensionsController = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to } = DateRangeSchema.parse(req.query);
    const shopId = req.authUser.shopId as string;
    const data = await getDimensionsStats(shopId, from, to);
    res.status(200).json({ data });
  },
);

export const getVelocityController = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to } = DateRangeSchema.parse(req.query);
    const shopId = req.authUser.shopId as string;
    const salesChannel =
      typeof req.query.salesChannel === "string"
        ? req.query.salesChannel
        : undefined;
    const data = await getSalesVelocity(
      from,
      to,
      shopId,
      salesChannel as
        | "webshop"
        | "physical"
        | "imported"
        | "unknown"
        | undefined,
    );
    res.status(200).json({ data });
  },
);

export const getSalesChannelController = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to } = DateRangeSchema.parse(req.query);
    const shopId = req.authUser.shopId as string;
    const data = await getSalesChannelOverview(shopId, from, to);
    res.status(200).json({ data });
  },
);

export const getInsightsController = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to } = DateRangeSchema.parse(req.query);
    const shopId = req.authUser.shopId as string;
    const data = await getSmartInsights(shopId, from, to);
    res.status(200).json({ data });
  },
);
