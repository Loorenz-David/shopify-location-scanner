import { Router } from "express";
import { authenticateUserMiddleware } from "../../auth/middleware/authenticate-user.middleware.js";
import { requireShopLinkMiddleware } from "../../auth/middleware/require-shop-link.middleware.js";
import {
  createFloorPlanController,
  deleteFloorPlanController,
  getFloorPlanController,
  listFloorPlansController,
  updateFloorPlanController,
} from "../controllers/floor-plan.controller.js";

export const floorPlanRouter = Router();

floorPlanRouter.use(authenticateUserMiddleware);
floorPlanRouter.use(requireShopLinkMiddleware);

floorPlanRouter.get("/", listFloorPlansController);
floorPlanRouter.post("/", createFloorPlanController);
floorPlanRouter.get("/:id", getFloorPlanController);
floorPlanRouter.patch("/:id", updateFloorPlanController);
floorPlanRouter.delete("/:id", deleteFloorPlanController);
