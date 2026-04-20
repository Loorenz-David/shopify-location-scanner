import { Router } from "express";
import { authenticateUserMiddleware } from "../../auth/middleware/authenticate-user.middleware.js";
import { requireShopLinkMiddleware } from "../../auth/middleware/require-shop-link.middleware.js";
import {
  batchUpdateZonesController,
  createZoneController,
  deleteZoneController,
  listZonesController,
  reorderZonesController,
  updateZoneController,
} from "../controllers/zones.controller.js";

export const zonesRouter = Router();

zonesRouter.use(authenticateUserMiddleware);
zonesRouter.use(requireShopLinkMiddleware);

zonesRouter.get("/", listZonesController);
zonesRouter.post("/", createZoneController);
zonesRouter.put("/batch", batchUpdateZonesController);
zonesRouter.put("/reorder", reorderZonesController);
zonesRouter.patch("/:id", updateZoneController);
zonesRouter.delete("/:id", deleteZoneController);
