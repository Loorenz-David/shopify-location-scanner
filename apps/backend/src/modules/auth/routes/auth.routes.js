import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { authController } from "../controllers/auth.controller.js";
import { authenticateUserMiddleware } from "../middleware/authenticate-user.middleware.js";
export const authRouter = Router();
authRouter.post("/register", asyncHandler(authController.register));
authRouter.post("/login", asyncHandler(authController.login));
authRouter.post("/refresh", asyncHandler(authController.refresh));
authRouter.post("/logout", authenticateUserMiddleware, asyncHandler(authController.logout));
authRouter.get("/me", authenticateUserMiddleware, asyncHandler(authController.me));
//# sourceMappingURL=auth.routes.js.map