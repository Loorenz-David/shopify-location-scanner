import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { authenticateUserMiddleware } from "../../auth/middleware/authenticate-user.middleware.js";
import { requireShopLinkMiddleware } from "../../auth/middleware/require-shop-link.middleware.js";
import { bootstrapController } from "../controllers/bootstrap.controller.js";

export const bootstrapRouter = Router();

bootstrapRouter.get(
  "/",
  authenticateUserMiddleware,
  requireShopLinkMiddleware,
  asyncHandler(bootstrapController.getPayload),
);
