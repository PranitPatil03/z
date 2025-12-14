import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

/**
 * Adds a unique correlation ID to every request.
 * Uses the incoming X-Request-ID header if present (from load balancer),
 * otherwise generates a new UUID.
 *
 * The ID is set on both the request and response headers for tracing.
 */
export function requestId(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const id = (request.headers["x-request-id"] as string) || crypto.randomUUID();
  request.headers["x-request-id"] = id;
  response.setHeader("x-request-id", id);
  next();
}
