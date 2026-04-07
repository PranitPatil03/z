import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, type ZodTypeAny } from "zod";

export interface ValidatedRequest extends Request {
  validated?: {
    body?: unknown;
    params?: unknown;
    query?: unknown;
  };
}

export type ValidationLocation = "body" | "params" | "query";

export interface ValidationMetadata {
  location: ValidationLocation;
  schema: ZodTypeAny;
}

export type ValidationAwareMiddleware = RequestHandler & {
  __validation?: ValidationMetadata;
};

function withValidationMetadata(
  middleware: RequestHandler,
  location: ValidationLocation,
  schema: ZodTypeAny,
): ValidationAwareMiddleware {
  const typedMiddleware = middleware as ValidationAwareMiddleware;
  typedMiddleware.__validation = {
    location,
    schema,
  };

  return typedMiddleware;
}

export function validateBody(schema: ZodTypeAny) {
  return withValidationMetadata((request: Request, _response: Response, next: NextFunction) => {
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
  }, "body", schema);
}

export function validateQuery(schema: ZodTypeAny) {
  return withValidationMetadata((request: Request, _response: Response, next: NextFunction) => {
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
  }, "query", schema);
}

export function validateParams(schema: ZodTypeAny) {
  return withValidationMetadata((request: Request, _response: Response, next: NextFunction) => {
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
  }, "params", schema);
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