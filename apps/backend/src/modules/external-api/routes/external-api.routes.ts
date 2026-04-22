import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { externalApiController } from "../controllers/external-api.controller.js";
import { authenticateExternalApiMiddleware } from "../middleware/authenticate-external-api.middleware.js";

export const externalApiRouter = Router();

externalApiRouter.use(authenticateExternalApiMiddleware);

externalApiRouter.post(
  "/orders/schedule",
  asyncHandler(externalApiController.scheduleOrderItems),
);
