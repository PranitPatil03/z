import type { NextFunction, Request, Response } from "express";
import { unauthorized } from "../lib/errors";
import { type PortalSession, portalAuthService } from "../services/portal-auth";

export interface PortalAuthenticatedRequest extends Request {
  portalSession: PortalSession;
}

export function getPortalSession(request: Request): PortalSession {
  const session = (request as Partial<PortalAuthenticatedRequest>)
    .portalSession;

  if (!session) {
    throw unauthorized("Portal session is required");
  }

  return session;
}

export async function requirePortalAuth(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw unauthorized("Missing or invalid authorization header");
  }

  const token = authHeader.slice(7);

  const session = await portalAuthService.verifyToken(token);

  (request as PortalAuthenticatedRequest).portalSession = session;

  next();
}
