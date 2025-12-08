import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Request } from "express";
import { members, projectMembers, projects, users } from "@foreman/db";
import { db } from "../database";
import { badRequest, notFound, unauthorized } from "../lib/errors";
import {
  createProjectMemberSchema,
  createProjectSchema,
  projectIdParamsSchema,
  projectMemberParamsSchema,
  projectMembersParamsSchema,
  updateProjectMemberSchema,
  updateProjectSchema,
} from "../schemas/project.schema";
import { getAuthContext } from "../middleware/require-auth";
import type { ValidatedRequest } from "../lib/validate";

function readValidatedBody<T>(request: Request) {
  return (request as ValidatedRequest).validated?.body as T;
}

function readValidatedParams<T>(request: Request) {
  return (request as ValidatedRequest).validated?.params as T;
}

function requireContext(request: Request) {
  const { session, user } = getAuthContext(request);
  if (!session.activeOrganizationId) {
    throw badRequest("An active organization is required");
  }

  return {
    orgId: session.activeOrganizationId,
    userId: user.id,
  };
}

async function loadOrgMembership(orgId: string, userId: string) {
  const [membership] = await db
    .select({ role: members.role })
    .from(members)
    .where(and(eq(members.organizationId, orgId), eq(members.userId, userId)))
    .limit(1);

  if (!membership) {
    throw unauthorized("You are not a member of this organization");
  }

  return membership;
}

function hasPortfolioAccess(role: string) {
  return role === "owner" || role === "admin";
}

async function ensureProject(orgId: string, projectId: string) {
  const [record] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, orgId), isNull(projects.deletedAt)))
    .limit(1);

  if (!record) {
    throw notFound("Project not found");
  }

  return record;
}

async function assertProjectAccess(input: { orgId: string; userId: string; projectId: string }) {
  const membership = await loadOrgMembership(input.orgId, input.userId);
  const project = await ensureProject(input.orgId, input.projectId);

  if (hasPortfolioAccess(membership.role)) {
    return project;
  }

  const [projectMembership] = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.organizationId, input.orgId),
        eq(projectMembers.projectId, input.projectId),
        eq(projectMembers.userId, input.userId),
      ),
    )
    .limit(1);

  if (!projectMembership) {
    throw notFound("Project not found");
  }

  return project;
}

export const projectService = {
  async listProjects(request: Request) {
    const { orgId, userId } = requireContext(request);
    const membership = await loadOrgMembership(orgId, userId);

    if (hasPortfolioAccess(membership.role)) {
      return await db
        .select()
        .from(projects)
        .where(and(eq(projects.organizationId, orgId), isNull(projects.deletedAt)));
    }

    const assignedMemberships = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.organizationId, orgId),
          eq(projectMembers.userId, userId),
        ),
      );

    const projectIds = Array.from(new Set(assignedMemberships.map((row) => row.projectId)));
    if (projectIds.length === 0) {
      return [];
    }

    return await db
      .select()
      .from(projects)
      .where(and(eq(projects.organizationId, orgId), isNull(projects.deletedAt), inArray(projects.id, projectIds)));
  },

  async createProject(request: Request) {
    const { orgId } = requireContext(request);
    const body = createProjectSchema.parse(readValidatedBody(request));

    const [record] = await db
      .insert(projects)
      .values({
        organizationId: orgId,
        name: body.name,
        code: body.code,
        description: body.description ?? null,
      })
      .returning();

    return record;
  },

  async getProject(request: Request) {
    const { orgId, userId } = requireContext(request);
    const params = projectIdParamsSchema.parse(readValidatedParams(request));

    return await assertProjectAccess({ orgId, userId, projectId: params.projectId });
  },

  async updateProject(request: Request) {
    const { orgId, userId } = requireContext(request);
    const params = projectIdParamsSchema.parse(readValidatedParams(request));
    const body = updateProjectSchema.parse(readValidatedBody(request));

    await assertProjectAccess({ orgId, userId, projectId: params.projectId });

    const [record] = await db
      .update(projects)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, params.projectId), eq(projects.organizationId, orgId), isNull(projects.deletedAt)))
      .returning();

    if (!record) {
      throw notFound("Project not found");
    }

    return record;
  },

  async archiveProject(request: Request) {
    const { orgId, userId } = requireContext(request);
    const params = projectIdParamsSchema.parse(readValidatedParams(request));

    await assertProjectAccess({ orgId, userId, projectId: params.projectId });

    const [record] = await db
      .update(projects)
      .set({
        status: "archived",
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, params.projectId), eq(projects.organizationId, orgId), isNull(projects.deletedAt)))
      .returning();

    if (!record) {
      throw notFound("Project not found");
    }

    return record;
  },

  async listProjectMembers(request: Request) {
    const { orgId, userId } = requireContext(request);
    const params = projectMembersParamsSchema.parse(readValidatedParams(request));

    await assertProjectAccess({ orgId, userId, projectId: params.projectId });

    const assignments = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.organizationId, orgId),
          eq(projectMembers.projectId, params.projectId),
        ),
      );

    if (assignments.length === 0) {
      return [];
    }

    const userIds = Array.from(new Set(assignments.map((item) => item.userId)));
    const people = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(inArray(users.id, userIds));

    const userById = new Map(people.map((person) => [person.id, person]));

    return assignments.map((assignment) => ({
      ...assignment,
      user: userById.get(assignment.userId) ?? null,
    }));
  },

  async createProjectMember(request: Request) {
    const { orgId } = requireContext(request);
    const params = projectMembersParamsSchema.parse(readValidatedParams(request));
    const body = createProjectMemberSchema.parse(readValidatedBody(request));

    await ensureProject(orgId, params.projectId);
    await loadOrgMembership(orgId, body.userId);

    const [record] = await db
      .insert(projectMembers)
      .values({
        organizationId: orgId,
        projectId: params.projectId,
        userId: body.userId,
        role: body.role,
        departmentIds: body.departmentIds,
      })
      .onConflictDoUpdate({
        target: [projectMembers.projectId, projectMembers.userId],
        set: {
          role: body.role,
          departmentIds: body.departmentIds,
          updatedAt: new Date(),
        },
      })
      .returning();

    return record;
  },

  async updateProjectMember(request: Request) {
    const { orgId } = requireContext(request);
    const params = projectMemberParamsSchema.parse(readValidatedParams(request));
    const body = updateProjectMemberSchema.parse(readValidatedBody(request));

    await ensureProject(orgId, params.projectId);

    const [record] = await db
      .update(projectMembers)
      .set({
        role: body.role,
        departmentIds: body.departmentIds,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectMembers.organizationId, orgId),
          eq(projectMembers.projectId, params.projectId),
          eq(projectMembers.userId, params.userId),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Project member not found");
    }

    return record;
  },

  async removeProjectMember(request: Request) {
    const { orgId } = requireContext(request);
    const params = projectMemberParamsSchema.parse(readValidatedParams(request));

    await ensureProject(orgId, params.projectId);

    const [record] = await db
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.organizationId, orgId),
          eq(projectMembers.projectId, params.projectId),
          eq(projectMembers.userId, params.userId),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Project member not found");
    }

    return record;
  },
};
