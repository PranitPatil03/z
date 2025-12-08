import { and, eq, isNull } from "drizzle-orm";
import { complianceItems } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  complianceItemIdParamsSchema,
  createComplianceItemSchema,
  updateComplianceItemSchema,
} from "../schemas/compliance.schema";

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

export const complianceService = {
  async list(request: Request) {
    const orgId = requireOrg(request);
    return await db
      .select()
      .from(complianceItems)
      .where(and(eq(complianceItems.organizationId, orgId), isNull(complianceItems.deletedAt)));
  },

  async create(request: Request) {
    const orgId = requireOrg(request);
    const body = createComplianceItemSchema.parse(readValidatedBody(request));

    const [record] = await db
      .insert(complianceItems)
      .values({
        organizationId: orgId,
        projectId: body.projectId,
        subcontractorId: body.subcontractorId ?? null,
        complianceType: body.complianceType,
        status: "pending",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes ?? null,
        evidence: body.evidence ?? null,
      })
      .returning();

    return record;
  },

  async get(request: Request) {
    const orgId = requireOrg(request);
    const params = complianceItemIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .select()
      .from(complianceItems)
      .where(
        and(
          eq(complianceItems.id, params.complianceItemId),
          eq(complianceItems.organizationId, orgId),
          isNull(complianceItems.deletedAt),
        ),
      );

    if (!record) {
      throw notFound("Compliance item not found");
    }

    return record;
  },

  async update(request: Request) {
    const orgId = requireOrg(request);
    const params = complianceItemIdParamsSchema.parse(readValidatedParams(request));
    const body = updateComplianceItemSchema.parse(readValidatedBody(request));

    const [record] = await db
      .update(complianceItems)
      .set({
        ...body,
        dueDate: body.dueDate === undefined ? undefined : body.dueDate ? new Date(body.dueDate) : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(complianceItems.id, params.complianceItemId),
          eq(complianceItems.organizationId, orgId),
          isNull(complianceItems.deletedAt),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Compliance item not found");
    }

    return record;
  },

  async archive(request: Request) {
    const orgId = requireOrg(request);
    const params = complianceItemIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .update(complianceItems)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(complianceItems.id, params.complianceItemId),
          eq(complianceItems.organizationId, orgId),
          isNull(complianceItems.deletedAt),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Compliance item not found");
    }

    return record;
  },
};
