import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import {
  authCredentialRateLimitMiddleware,
  authLogoutRateLimitMiddleware,
  authRefreshRateLimitMiddleware,
} from "../../../shared/http/rate-limit-middleware.js";
import { authController } from "../controllers/auth.controller.js";
import { authenticateUserMiddleware } from "../middleware/authenticate-user.middleware.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  authCredentialRateLimitMiddleware,
  asyncHandler(authController.register),
);
authRouter.post(
  "/login",
  authCredentialRateLimitMiddleware,
  asyncHandler(authController.login),
);
authRouter.post(
  "/refresh",
  authRefreshRateLimitMiddleware,
  asyncHandler(authController.refresh),
);
authRouter.post(
  "/logout",
  authLogoutRateLimitMiddleware,
  authenticateUserMiddleware,
  asyncHandler(authController.logout),
);
authRouter.get(
  "/me",
  authenticateUserMiddleware,
  asyncHandler(authController.me),
);
authRouter.post(
  "/app-enter",
  authenticateUserMiddleware,
  asyncHandler(authController.appEnter),
);
authRouter.post(
  "/app-leave",
  authenticateUserMiddleware,
  asyncHandler(authController.appLeave),
);
