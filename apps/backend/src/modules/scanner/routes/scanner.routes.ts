import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { authenticateUserMiddleware } from "../../auth/middleware/authenticate-user.middleware.js";
import { requireShopLinkMiddleware } from "../../auth/middleware/require-shop-link.middleware.js";
import { scannerController } from "../controllers/scanner.controller.js";

export const scannerRouter = Router();

scannerRouter.get(
  "/history",
  authenticateUserMiddleware,
  requireShopLinkMiddleware,
  asyncHandler(scannerController.getHistory),
);
