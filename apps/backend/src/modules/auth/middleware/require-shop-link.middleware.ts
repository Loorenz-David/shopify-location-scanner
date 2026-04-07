import type { NextFunction, Request, Response } from "express";
import { NotFoundError } from "../../../shared/errors/http-errors.js";
import { userRepository } from "../repositories/user.repository.js";

export const requireShopLinkMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  // Tokens can carry a stale shopId claim right after linking/unlinking;
  // fallback to current DB state before rejecting the request.
  if (req.authUser.shopId) {
    next();
    return;
  }

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
