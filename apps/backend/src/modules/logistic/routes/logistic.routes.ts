import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { authenticateUserMiddleware } from "../../auth/middleware/authenticate-user.middleware.js";
import { requireShopLinkMiddleware } from "../../auth/middleware/require-shop-link.middleware.js";
import { logisticController } from "../controllers/logistic.controller.js";

export const logisticRouter = Router();

logisticRouter.use(authenticateUserMiddleware, requireShopLinkMiddleware);

// Logistic locations — admin-managed master data
logisticRouter.get(
  "/get-location",
  asyncHandler(logisticController.listLocations),
);
logisticRouter.put(
  "/add-location",
  asyncHandler(logisticController.createLocation),
);
logisticRouter.patch(
  "/update-location/:locationId",
  asyncHandler(logisticController.updateLocation),
);
logisticRouter.delete(
  "/delete-location/:locationId",
  asyncHandler(logisticController.deleteLocation),
);

// Task list
logisticRouter.get(
  "/items/active-task-ids",
  asyncHandler(logisticController.getActiveTaskIds),
);
logisticRouter.get("/items", asyncHandler(logisticController.getItems));

// Actions
logisticRouter.post(
  "/intentions",
  asyncHandler(logisticController.markIntention),
);
logisticRouter.post(
  "/placements",
  asyncHandler(logisticController.markPlacement),
);
logisticRouter.post("/fulfil", asyncHandler(logisticController.fulfilItem));
logisticRouter.post(
  "/item-is-fix",
  asyncHandler(logisticController.markItemFixed),
);
logisticRouter.patch(
  "/fix-notes/:scanHistoryId",
  asyncHandler(logisticController.updateFixNotes),
);

// Push subscription management
logisticRouter.post(
  "/push-subscription",
  asyncHandler(logisticController.savePushSubscription),
);
logisticRouter.delete(
  "/push-subscription",
  asyncHandler(logisticController.deletePushSubscription),
);
