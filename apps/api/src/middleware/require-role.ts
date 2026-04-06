import type { NextFunction, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { members, projectMembers } from "@foreman/db";
import { db } from "../database";
import { getAuthContext } from "./require-auth";
import { unauthorized, badRequest } from "../lib/errors";

/**
 * Organization-level roles (from Better Auth org plugin).
 * "owner" has full access, "admin" has management access, "member" has basic access.
 */
export type OrgRole = "owner" | "admin" | "member";

/**
 * Project-level roles for fine-grained access within a project.
 */
export type ProjectRole = "pm" | "field_supervisor" | "viewer";

/**
 * Middleware that checks if the authenticated user has one of the required
 * organization-level roles. Must be used AFTER requireAuth middleware.
 *
 * Usage: router.post("/approve", requireAuth, requireOrgRole("owner", "admin"), controller)
 */
export function requireOrgRole(...allowedRoles: OrgRole[]) {
  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      const { user, session } = getAuthContext(request);

      if (!session.activeOrganizationId) {
        throw badRequest("An active organization is required");
      }

      const [membership] = await db
        .select({ role: members.role })
        .from(members)
        .where(
          and(
            eq(members.organizationId, session.activeOrganizationId),
            eq(members.userId, user.id),
          ),
        )
        .limit(1);

      if (!membership) {
        throw unauthorized("You are not a member of this organization");
      }

      if (!allowedRoles.includes(membership.role as OrgRole)) {
        throw unauthorized(
          `This action requires one of these roles: ${allowedRoles.join(", ")}`,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware that checks if the authenticated user has one of the required
 * project-level roles. Reads projectId from request params or query.
 * Must be used AFTER requireAuth middleware.
 *
 * Usage: router.post("/change-orders/:changeOrderId/decision", requireAuth, requireProjectRole("pm", "owner"), controller)
 */
export function requireProjectRole(...allowedRoles: (ProjectRole | OrgRole)[]) {
  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      const { user, session } = getAuthContext(request);

      if (!session.activeOrganizationId) {
        throw badRequest("An active organization is required");
      }

      // Check org-level role first — org owners/admins bypass project role checks
      const [orgMembership] = await db
        .select({ role: members.role })
        .from(members)
        .where(
          and(
            eq(members.organizationId, session.activeOrganizationId),
            eq(members.userId, user.id),
          ),
        )
        .limit(1);

      if (!orgMembership) {
        throw unauthorized("You are not a member of this organization");
      }

      // Org owners always pass
      if (orgMembership.role === "owner") {
        next();
        return;
      }

      // If the allowed roles include the org-level role, pass
      if (allowedRoles.includes(orgMembership.role as OrgRole)) {
        next();
        return;
      }

      // Otherwise check project-level role
      const rawProjectId = request.params.projectId || request.query.projectId || request.body?.projectId;
      const projectId = typeof rawProjectId === "string" ? rawProjectId : undefined;

      if (!projectId) {
        throw badRequest("Project ID is required for role-based access");
      }

      const [projectMembership] = await db
        .select({ role: projectMembers.role })
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, user.id),
            eq(projectMembers.organizationId, session.activeOrganizationId),
          ),
        )
        .limit(1);

      if (!projectMembership) {
        throw unauthorized("You are not a member of this project");
      }

      if (!allowedRoles.includes(projectMembership.role as ProjectRole)) {
        throw unauthorized(
          `This action requires one of these project roles: ${allowedRoles.join(", ")}`,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
