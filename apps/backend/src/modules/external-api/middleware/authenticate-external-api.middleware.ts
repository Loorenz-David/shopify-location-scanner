import type { NextFunction, Request, Response } from "express";
import { env } from "../../../config/env.js";
import { UnauthorizedError } from "../../../shared/errors/http-errors.js";

export const authenticateExternalApiMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const apiKeyHeader = req.header("x-api-key");

  if (!apiKeyHeader || apiKeyHeader !== env.EXTERNAL_API_KEY) {
    next(new UnauthorizedError("Invalid or missing API key"));
    return;
  }

  next();
};
