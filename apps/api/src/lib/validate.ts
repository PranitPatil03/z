import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodTypeAny } from "zod";

export interface ValidatedRequest extends Request {
  validated?: {
    body?: unknown;
    params?: unknown;
    query?: unknown;
  };
}

export function validateBody(schema: ZodTypeAny) {
  return (request: Request, _response: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(request.body);
      const validatedRequest = request as ValidatedRequest;
      validatedRequest.validated = {
        ...(validatedRequest.validated ?? {}),
        body: parsed,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateQuery(schema: ZodTypeAny) {
  return (request: Request, _response: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(request.query);
      const validatedRequest = request as ValidatedRequest;
      validatedRequest.validated = {
        ...(validatedRequest.validated ?? {}),
        query: parsed,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateParams(schema: ZodTypeAny) {
  return (request: Request, _response: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(request.params);
      const validatedRequest = request as ValidatedRequest;
      validatedRequest.validated = {
        ...(validatedRequest.validated ?? {}),
        params: parsed,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function parseZodError(error: unknown) {
  if (error instanceof ZodError) {
    return {
      message: "Validation failed",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  return null;
}
