import type { Request, Response, NextFunction } from "express";
import { portalAuthService, type PortalSession } from "../services/portal-auth";
import { unauthorized } from "../lib/errors";

export async function requirePortalAuth(request: Request, _response: Response, next: NextFunction) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw unauthorized("Missing or invalid authorization header");
  }

  const token = authHeader.slice(7);

  const session = await portalAuthService.verifyToken(token);

  (request as any).portalSession = session;

  next();
}
