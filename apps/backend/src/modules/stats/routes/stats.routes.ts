import { Router } from "express";
import { authenticateUserMiddleware } from "../../auth/middleware/authenticate-user.middleware.js";
import { requireShopLinkMiddleware } from "../../auth/middleware/require-shop-link.middleware.js";
import {
  getCategoriesController,
  getDimensionsController,
  getInsightsController,
  getSalesChannelController,
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
statsRouter.get("/channels", getSalesChannelController);
statsRouter.get("/dimensions", getDimensionsController);
statsRouter.get("/velocity", getVelocityController);
statsRouter.get("/insights", getInsightsController);
