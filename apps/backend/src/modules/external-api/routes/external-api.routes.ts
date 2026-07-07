import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { externalApiController } from "../controllers/external-api.controller.js";
import { authenticateExternalApiMiddleware } from "../middleware/authenticate-external-api.middleware.js";

export const externalApiRouter = Router();
export const externalManagerAppRouter = Router();

externalApiRouter.use(authenticateExternalApiMiddleware);
externalManagerAppRouter.use(authenticateExternalApiMiddleware);

externalApiRouter.post(
  "/orders/schedule",
  asyncHandler(externalApiController.scheduleOrderItems),
);

externalApiRouter.get(
  "/manager-app/items/location",
  asyncHandler(externalApiController.getManagerAppItemsLocation),
);

externalApiRouter.patch(
  "/manager-app/items/location",
  asyncHandler(externalApiController.updateManagerAppItemsLocation),
);

externalManagerAppRouter.get(
  "/items/location",
  asyncHandler(externalApiController.getManagerAppItemsLocation),
);

externalManagerAppRouter.patch(
  "/items/location",
  asyncHandler(externalApiController.updateManagerAppItemsLocation),
);
