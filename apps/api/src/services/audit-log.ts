import { and, eq } from "drizzle-orm";
import { auditLogs } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import { auditLogIdParamsSchema, createAuditLogSchema, listAuditLogsQuerySchema } from "../schemas/audit-log.schema";

function readValidatedBody<T>(request: Request) {
  return (request as ValidatedRequest).validated?.body as T;
}

function readValidatedParams<T>(request: Request) {
  return (request as ValidatedRequest).validated?.params as T;
}

function readValidatedQuery<T>(request: Request) {
  return (request as ValidatedRequest).validated?.query as T;
}

function requireContext(request: Request) {
  const { session, user } = getAuthContext(request);
  if (!session.activeOrganizationId) {
    throw badRequest("An active organization is required");
  }
  return { orgId: session.activeOrganizationId, userId: user.id };
}

export const auditLogService = {
  async list(request: Request) {
    const { orgId } = requireContext(request);
    const query = listAuditLogsQuerySchema.parse(readValidatedQuery(request) ?? request.query);

    const filters = [eq(auditLogs.organizationId, orgId)];
    if (query.entityType) {
      filters.push(eq(auditLogs.entityType, query.entityType));
    }
    if (query.action) {
      filters.push(eq(auditLogs.action, query.action));
    }

    return await db.select().from(auditLogs).where(and(...filters));
  },

  async create(request: Request) {
    const { orgId, userId } = requireContext(request);
    const body = createAuditLogSchema.parse(readValidatedBody(request));

    const [record] = await db
      .insert(auditLogs)
      .values({
        organizationId: orgId,
        actorUserId: userId,
        entityType: body.entityType,
        entityId: body.entityId,
        action: body.action,
        beforeData: body.beforeData ?? null,
        afterData: body.afterData ?? null,
        metadata: body.metadata ?? null,
      })
      .returning();

    return record;
  },

  async get(request: Request) {
    const { orgId } = requireContext(request);
    const params = auditLogIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.id, params.auditLogId), eq(auditLogs.organizationId, orgId)));

    if (!record) {
      throw notFound("Audit log not found");
    }

    return record;
  },
};
