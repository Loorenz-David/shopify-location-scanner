import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { authenticateUserMiddleware } from "../../auth/middleware/authenticate-user.middleware.js";
import { requireAdminMiddleware } from "../../auth/middleware/require-admin.middleware.js";
import { requireShopLinkMiddleware } from "../../auth/middleware/require-shop-link.middleware.js";
import { outboundWebhookController } from "../controllers/outbound-webhook.controller.js";

export const outboundWebhookRouter = Router();

outboundWebhookRouter.use(
  authenticateUserMiddleware,
  requireAdminMiddleware,
  requireShopLinkMiddleware,
);

outboundWebhookRouter.post("/", asyncHandler(outboundWebhookController.register));
outboundWebhookRouter.get("/", asyncHandler(outboundWebhookController.list));
// §12A.9: registered before the `/:id` routes so neither path is shadowed.
outboundWebhookRouter.get(
  "/deliveries",
  asyncHandler(outboundWebhookController.deliveries),
);
outboundWebhookRouter.get(
  "/manager-stock",
  asyncHandler(outboundWebhookController.managerStock),
);

outboundWebhookRouter.patch(
  "/:id/active",
  asyncHandler(outboundWebhookController.toggle),
);
outboundWebhookRouter.delete(
  "/:id",
  asyncHandler(outboundWebhookController.remove),
);
