import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import { parseZodError } from "../lib/validate";

function toObjectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
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

  const errorObject = toObjectRecord(error);
  const statusCode =
    errorObject && typeof errorObject.statusCode === "number"
      ? errorObject.statusCode
      : null;

  if (statusCode && statusCode >= 400 && statusCode < 600) {
    const bodyObject = toObjectRecord(errorObject?.body);
    const errorCode =
      (bodyObject && typeof bodyObject.code === "string"
        ? bodyObject.code
        : null) ??
      (errorObject && typeof errorObject.code === "string"
        ? errorObject.code
        : null) ??
      (statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "HTTP_ERROR");

    const errorMessage =
      (bodyObject && typeof bodyObject.message === "string"
        ? bodyObject.message
        : null) ??
      (errorObject && typeof errorObject.message === "string"
        ? errorObject.message
        : null) ??
      "Request failed";

    response.status(statusCode).json({
      error: {
        code: errorCode,
        message: errorMessage,
        details: bodyObject ?? null,
      },
    });
    return;
  }

  logger.error(
    { err: error, requestId: _request.headers["x-request-id"] },
    "Unhandled server error",
  );
  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
    },
  });
}
