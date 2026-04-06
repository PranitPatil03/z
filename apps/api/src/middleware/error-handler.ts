import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import { parseZodError } from "../lib/validate";

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? null,
      },
    });
    return;
  }

  const validationError = parseZodError(error);
  if (validationError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        ...validationError,
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        issues: error.issues,
      },
    });
    return;
  }

  logger.error({ err: error, requestId: _request.headers["x-request-id"] }, "Unhandled server error");
  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
    },
  });
}
