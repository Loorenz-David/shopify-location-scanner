import { Router } from "express";
import { authenticateUserMiddleware } from "../../auth/middleware/authenticate-user.middleware.js";
import { requireShopLinkMiddleware } from "../../auth/middleware/require-shop-link.middleware.js";
import {
  getCategoriesController,
  getCategoryByLocationController,
  getDimensionsController,
  getInsightsController,
  getSalesChannelController,
  getStatsItemsController,
  getTimePatternsController,
  getVelocityController,
  getZoneDetailController,
  getZonesOverviewController,
} from "../controllers/stats.controller.js";

export const statsRouter = Router();

statsRouter.use(authenticateUserMiddleware);
statsRouter.use(requireShopLinkMiddleware);

statsRouter.get("/zones", getZonesOverviewController);
statsRouter.get("/zones/:location", getZoneDetailController);
statsRouter.get("/categories", getCategoriesController);
statsRouter.get("/categories/:category/locations", getCategoryByLocationController);
statsRouter.get("/channels", getSalesChannelController);
statsRouter.get("/dimensions", getDimensionsController);
statsRouter.get("/velocity", getVelocityController);
statsRouter.get("/insights", getInsightsController);
statsRouter.get("/time-patterns", getTimePatternsController);
statsRouter.get("/items", getStatsItemsController);
