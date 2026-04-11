import { rfqs } from "@foreman/db";
import { and, eq, isNull } from "drizzle-orm";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  createRfqSchema,
  rfqIdParamsSchema,
  updateRfqSchema,
} from "../schemas/rfq.schema";

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
  return {
    orgId: session.activeOrganizationId,
    userId: getAuthContext(request).user.id,
  };
}

export const rfqService = {
  async list(request: Request) {
    const { orgId } = requireOrg(request);
    return await db
      .select()
      .from(rfqs)
      .where(and(eq(rfqs.organizationId, orgId), isNull(rfqs.deletedAt)));
  },

  async create(request: Request) {
    const { orgId, userId } = requireOrg(request);
    const body = createRfqSchema.parse(readValidatedBody(request));

    const [record] = await db
      .insert(rfqs)
      .values({
        organizationId: orgId,
        projectId: body.projectId,
        title: body.title,
        scope: body.scope,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        status: "draft",
        createdByUserId: userId,
        metadata: body.metadata ?? null,
      })
      .returning();

    return record;
  },

  async get(request: Request) {
    const { orgId } = requireOrg(request);
    const params = rfqIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .select()
      .from(rfqs)
      .where(
        and(
          eq(rfqs.id, params.rfqId),
          eq(rfqs.organizationId, orgId),
          isNull(rfqs.deletedAt),
        ),
      );

    if (!record) {
      throw notFound("RFQ not found");
    }

    return record;
  },

  async update(request: Request) {
    const { orgId } = requireOrg(request);
    const params = rfqIdParamsSchema.parse(readValidatedParams(request));
    const body = updateRfqSchema.parse(readValidatedBody(request));

    const [record] = await db
      .update(rfqs)
      .set({
        ...body,
        dueDate:
          body.dueDate === undefined
            ? undefined
            : body.dueDate
              ? new Date(body.dueDate)
              : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(rfqs.id, params.rfqId),
          eq(rfqs.organizationId, orgId),
          isNull(rfqs.deletedAt),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("RFQ not found");
    }

    return record;
  },

  async archive(request: Request) {
    const { orgId } = requireOrg(request);
    const params = rfqIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .update(rfqs)
      .set({ status: "canceled", deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(rfqs.id, params.rfqId),
          eq(rfqs.organizationId, orgId),
          isNull(rfqs.deletedAt),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("RFQ not found");
    }

    return record;
  },
};
