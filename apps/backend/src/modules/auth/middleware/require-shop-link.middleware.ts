import type { NextFunction, Request, Response } from "express";
import { NotFoundError, UnauthorizedError } from "../../../shared/errors/http-errors.js";
import { userRepository } from "../repositories/user.repository.js";

export const requireShopLinkMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  // Always trust the current DB linkage over token claims.
  // This avoids stale non-null shopId values after relink/unlink flows.
  // Also validates tokenVersion to ensure invalidated tokens are rejected.
  userRepository
    .findById(req.authUser.userId)
    .then((user) => {
      if (!user?.shopId) {
        next(new NotFoundError("Linked Shopify store not found"));
        return;
      }

      if (user.tokenVersion !== req.authUser.tokenVersion) {
        next(new UnauthorizedError("Token has been invalidated"));
        return;
      }

      req.authUser.shopId = user.shopId;
      next();
    })
    .catch(next);
};
