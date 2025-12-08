import { and, eq, isNull } from "drizzle-orm";
import type { Request } from "express";
import { projects } from "@foreman/db";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import { createProjectSchema, projectIdParamsSchema, updateProjectSchema } from "../schemas/project.schema";
import { getAuthContext } from "../middleware/require-auth";
import type { ValidatedRequest } from "../lib/validate";

function readValidatedBody<T>(request: Request) {
  return (request as ValidatedRequest).validated?.body as T;
}

function readValidatedParams<T>(request: Request) {
  return (request as ValidatedRequest).validated?.params as T;
}

export const projectService = {
  async listProjects(request: Request) {
    const { session } = getAuthContext(request);

    const records = await db.select().from(projects).where(and(eq(projects.organizationId, session.activeOrganizationId ?? ""), isNull(projects.deletedAt)));

    return records;
  },

  async createProject(request: Request) {
    const { session } = getAuthContext(request);
    const body = createProjectSchema.parse(readValidatedBody(request));

    if (!session.activeOrganizationId) {
      throw badRequest("An active organization is required to create a project");
    }

    const [record] = await db
      .insert(projects)
      .values({
        organizationId: session.activeOrganizationId,
        name: body.name,
        code: body.code,
        description: body.description ?? null,
      })
      .returning();

    return record;
  },

  async getProject(request: Request) {
    const { session } = getAuthContext(request);
    const params = projectIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, params.projectId), eq(projects.organizationId, session.activeOrganizationId ?? ""), isNull(projects.deletedAt)));

    if (!record) {
      throw notFound("Project not found");
    }

    return record;
  },

  async updateProject(request: Request) {
    const { session } = getAuthContext(request);
    const params = projectIdParamsSchema.parse(readValidatedParams(request));
    const body = updateProjectSchema.parse(readValidatedBody(request));

    const [record] = await db
      .update(projects)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, params.projectId), eq(projects.organizationId, session.activeOrganizationId ?? ""), isNull(projects.deletedAt)))
      .returning();

    if (!record) {
      throw notFound("Project not found");
    }

    return record;
  },

  async archiveProject(request: Request) {
    const { session } = getAuthContext(request);
    const params = projectIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .update(projects)
      .set({
        status: "archived",
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, params.projectId), eq(projects.organizationId, session.activeOrganizationId ?? ""), isNull(projects.deletedAt)))
      .returning();

    if (!record) {
      throw notFound("Project not found");
    }

    return record;
  },
};
