import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../../shared/errors/http-errors.js";
import { tokenService } from "../integrations/token.service.js";

const getBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

export const authenticateUserMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const token = getBearerToken(req.header("authorization"));

  if (!token) {
    next(new UnauthorizedError("Missing bearer token"));
    return;
  }

  try {
    const principal = tokenService.verifyAccessToken(token);
    req.authUser = principal;
    next();
  } catch {
    next(new UnauthorizedError("Invalid access token"));
  }
};
