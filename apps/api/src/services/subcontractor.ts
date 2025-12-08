import { and, eq, isNull } from "drizzle-orm";
import { subcontractors } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  createSubcontractorSchema,
  subcontractorIdParamsSchema,
  updateSubcontractorSchema,
} from "../schemas/subcontractor.schema";

function readValidatedBody<T>(request: Request) {
  return (request as ValidatedRequest).validated?.body as T;
}

function readValidatedParams<T>(request: Request) {
  return (request as ValidatedRequest).validated?.params as T;
}

function requireOrg(request: Request) {
  const { session } = getAuthContext(request);
  if (!session.activeOrganizationId) {
    throw badRequest("An active organization is required");
  }
  return session.activeOrganizationId;
}

export const subcontractorService = {
  async list(request: Request) {
    const orgId = requireOrg(request);
    return await db
      .select()
      .from(subcontractors)
      .where(and(eq(subcontractors.organizationId, orgId), isNull(subcontractors.deletedAt)));
  },

  async create(request: Request) {
    const orgId = requireOrg(request);
    const body = createSubcontractorSchema.parse(readValidatedBody(request));

    const [record] = await db
      .insert(subcontractors)
      .values({
        organizationId: orgId,
        projectId: body.projectId ?? null,
        name: body.name,
        email: body.email ?? null,
        phone: body.phone ?? null,
        trade: body.trade,
        status: "active",
        metadata: body.metadata ?? null,
      })
      .returning();

    return record;
  },

  async get(request: Request) {
    const orgId = requireOrg(request);
    const params = subcontractorIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .select()
      .from(subcontractors)
      .where(
        and(
          eq(subcontractors.id, params.subcontractorId),
          eq(subcontractors.organizationId, orgId),
          isNull(subcontractors.deletedAt),
        ),
      );

    if (!record) {
      throw notFound("Subcontractor not found");
    }

    return record;
  },

  async update(request: Request) {
    const orgId = requireOrg(request);
    const params = subcontractorIdParamsSchema.parse(readValidatedParams(request));
    const body = updateSubcontractorSchema.parse(readValidatedBody(request));

    const [record] = await db
      .update(subcontractors)
      .set({ ...body, updatedAt: new Date() })
      .where(
        and(
          eq(subcontractors.id, params.subcontractorId),
          eq(subcontractors.organizationId, orgId),
          isNull(subcontractors.deletedAt),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Subcontractor not found");
    }

    return record;
  },

  async archive(request: Request) {
    const orgId = requireOrg(request);
    const params = subcontractorIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .update(subcontractors)
      .set({ status: "inactive", deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(subcontractors.id, params.subcontractorId),
          eq(subcontractors.organizationId, orgId),
          isNull(subcontractors.deletedAt),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Subcontractor not found");
    }

    return record;
  },
};
