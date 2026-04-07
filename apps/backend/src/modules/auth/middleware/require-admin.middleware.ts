import type { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../../../shared/errors/http-errors.js";

export const requireAdminMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (req.authUser.role !== "admin") {
    next(new ForbiddenError("Admin role is required"));
    return;
  }

  next();
};
