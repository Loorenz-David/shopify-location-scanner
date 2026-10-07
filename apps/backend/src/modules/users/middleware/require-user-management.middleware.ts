import type { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../../../shared/errors/http-errors.js";

export function requireUserManagementMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.authUser.role !== "admin" && req.authUser.role !== "manager") {
    next(new ForbiddenError("Admin or manager role is required"));
    return;
  }
  next();
}
