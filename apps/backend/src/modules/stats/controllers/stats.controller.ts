import type { Request, Response } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { ValidationError } from "../../../shared/errors/http-errors.js";
import { DateRangeSchema } from "../contracts/stats.contract.js";
import { StatsItemsQuerySchema } from "../contracts/stats-items.contract.js";
import { getStatsItemsQuery } from "../queries/get-stats-items.query.js";
import {
  getCategoriesOverview,
  getCategoryByLocation,
  getDimensionsStats,
  getSalesChannelOverview,
  getSalesVelocity,
  getSmartInsights,
  getTimePatterns,
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

export const getCategoryByLocationController = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to } = DateRangeSchema.parse(req.query);
    const shopId = req.authUser.shopId as string;
    const rawCategory = req.params.category;

    if (!rawCategory || Array.isArray(rawCategory)) {
      throw new ValidationError("Category path parameter is required");
    }

    const category = decodeURIComponent(rawCategory);
    const data = await getCategoryByLocation(shopId, category, from, to);
    res.status(200).json({ data });
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

export const getTimePatternsController = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to } = DateRangeSchema.parse(req.query);
    const shopId = req.authUser.shopId as string;
    const salesChannel =
      typeof req.query.salesChannel === "string"
        ? (req.query.salesChannel as "webshop" | "physical" | "imported" | "unknown")
        : undefined;
    const latestLocation =
      typeof req.query.latestLocation === "string" && req.query.latestLocation.trim()
        ? req.query.latestLocation.trim()
        : undefined;
    const itemCategory =
      typeof req.query.itemCategory === "string" && req.query.itemCategory.trim()
        ? req.query.itemCategory.trim()
        : undefined;
    const data = await getTimePatterns(shopId, from, to, salesChannel, latestLocation, itemCategory);
    res.status(200).json({ data });
  },
);

export const getStatsItemsController = asyncHandler(
  async (req: Request, res: Response) => {
    const query = StatsItemsQuerySchema.parse(req.query);
    const shopId = req.authUser.shopId as string;

    const data = await getStatsItemsQuery({
      shopId,
      page: query.page,
      filters: {
        ...(query.from ? { from: query.from } : {}),
        ...(query.to ? { to: query.to } : {}),
        ...(query.latestLocation ? { latestLocation: query.latestLocation } : {}),
        ...(typeof query.isSold === "boolean" ? { isSold: query.isSold } : {}),
        ...(query.itemCategory ? { itemCategory: query.itemCategory } : {}),
        ...(query.lastSoldChannel ? { lastSoldChannel: query.lastSoldChannel } : {}),
        ...(query.heightMin !== undefined ? { heightMin: query.heightMin } : {}),
        ...(query.heightMax !== undefined ? { heightMax: query.heightMax } : {}),
        ...(query.widthMin !== undefined ? { widthMin: query.widthMin } : {}),
        ...(query.widthMax !== undefined ? { widthMax: query.widthMax } : {}),
        ...(query.depthMin !== undefined ? { depthMin: query.depthMin } : {}),
        ...(query.depthMax !== undefined ? { depthMax: query.depthMax } : {}),
        ...(query.hourOfDay !== undefined ? { hourOfDay: query.hourOfDay } : {}),
        ...(query.weekday !== undefined ? { weekday: query.weekday } : {}),
      },
      sort: {
        sortBy: query.sortBy,
        sortDir: query.sortDir,
      },
      groupByOrder: query.groupByOrder ?? false,
      ...(query.volumeLabel ? { volumeLabel: query.volumeLabel } : {}),
    });

    res.status(200).json({ data });
  },
);
