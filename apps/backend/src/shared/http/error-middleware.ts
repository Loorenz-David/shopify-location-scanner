import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";
import { ValidationError } from "../errors/http-errors.js";
import { logger } from "../logging/logger.js";
import { env } from "../../config/env.js";

type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
};

const toAppError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ValidationError("Request validation failed", error.flatten());
  }

  return new AppError("Internal server error", {
    code: "INTERNAL_ERROR",
    statusCode: 500,
    expose: false,
  });
};

export const errorMiddleware = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const appError = toAppError(error);

  logger.error("Request failed", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    code: appError.code,
    statusCode: appError.statusCode,
    message: appError.message,
    details: appError.details,
    stack: error instanceof Error ? error.stack : undefined,
  });

  const payload: ErrorResponse = {
    error: {
      code: appError.code,
      message:
        appError.expose || env.NODE_ENV !== "production"
          ? appError.message
          : "Internal server error",
      requestId: req.requestId,
      ...(appError.details ? { details: appError.details } : {}),
    },
  };

  res.status(appError.statusCode).json(payload);
};
