import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";
import { unauthorized } from "../lib/errors";

export interface RequestAuthContext {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  session: {
    id: string;
    activeOrganizationId?: string;
    activeTeamId?: string;
  };
}

export interface AuthenticatedRequest extends Request {
  authContext?: RequestAuthContext;
}

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  if (!session?.user) {
    next(unauthorized());
    return;
  }

  (request as AuthenticatedRequest).authContext = {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? undefined,
    },
    session: {
      id: session.session.id,
      activeOrganizationId: session.session.activeOrganizationId ?? undefined,
      activeTeamId: session.session.activeTeamId ?? undefined,
    },
  };

  next();
}

export function getAuthContext(request: Request) {
  const authenticated = request as AuthenticatedRequest;
  if (!authenticated.authContext) {
    throw unauthorized();
  }
  return authenticated.authContext;
}
