import type { NextFunction, Request, Response } from "express";
import { NotFoundError } from "../../../shared/errors/http-errors.js";
import { userRepository } from "../repositories/user.repository.js";

export const requireShopLinkMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  // Always trust the current DB linkage over token claims.
  // This avoids stale non-null shopId values after relink/unlink flows.
  userRepository
    .findById(req.authUser.userId)
    .then((user) => {
      if (!user?.shopId) {
        next(new NotFoundError("Linked Shopify store not found"));
        return;
      }

      req.authUser.shopId = user.shopId;
      next();
    })
    .catch(next);
};
