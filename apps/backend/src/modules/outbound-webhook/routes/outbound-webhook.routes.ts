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
outboundWebhookRouter.patch(
  "/:id/active",
  asyncHandler(outboundWebhookController.toggle),
);
outboundWebhookRouter.delete(
  "/:id",
  asyncHandler(outboundWebhookController.remove),
);
