import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { authenticateUserMiddleware } from "../../auth/middleware/authenticate-user.middleware.js";
import { requireShopLinkMiddleware } from "../../auth/middleware/require-shop-link.middleware.js";
import { requireAdminMiddleware } from "../../auth/middleware/require-admin.middleware.js";
import { usersController } from "../controllers/users.controller.js";

export const usersRouter = Router();

usersRouter.use(
  authenticateUserMiddleware,
  requireShopLinkMiddleware,
  requireAdminMiddleware,
);

usersRouter.get("/", asyncHandler(usersController.getUsers));
usersRouter.post("/change-role", asyncHandler(usersController.changeRole));
