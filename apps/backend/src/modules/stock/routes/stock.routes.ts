import { Router } from "express";
import { authenticateUserMiddleware } from "../../auth/middleware/authenticate-user.middleware.js";
import { requireShopLinkMiddleware } from "../../auth/middleware/require-shop-link.middleware.js";
import {
  createLocationStocksController,
  deleteLocationStockController,
  getLocationStockDetailController,
  getStockConfigurationOptionsController,
  listStockLocationsController,
  updateLocationStockController,
} from "../controllers/stock.controller.js";

export const stockRouter = Router();

stockRouter.use(authenticateUserMiddleware);
stockRouter.use(requireShopLinkMiddleware);

stockRouter.get("/options", getStockConfigurationOptionsController);
stockRouter.get("/locations", listStockLocationsController);
stockRouter.get("/locations/:location", getLocationStockDetailController);
stockRouter.post("/configurations", createLocationStocksController);
stockRouter.patch("/configurations/:id", updateLocationStockController);
stockRouter.delete("/configurations/:id", deleteLocationStockController);
