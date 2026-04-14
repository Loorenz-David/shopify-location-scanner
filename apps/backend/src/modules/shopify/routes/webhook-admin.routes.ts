import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { authenticateUserMiddleware } from "../../auth/middleware/authenticate-user.middleware.js";
import { requireAdminMiddleware } from "../../auth/middleware/require-admin.middleware.js";
import { webhookAdminController } from "../controllers/webhook-admin.controller.js";

export const webhookAdminRouter = Router();

webhookAdminRouter.use(authenticateUserMiddleware);
webhookAdminRouter.use(requireAdminMiddleware);

webhookAdminRouter.get("/", asyncHandler(webhookAdminController.list));
webhookAdminRouter.get("/:id", asyncHandler(webhookAdminController.getById));
webhookAdminRouter.post(
  "/:id/replay",
  asyncHandler(webhookAdminController.replay),
);
