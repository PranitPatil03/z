import { integrations } from "@foreman/db";
import { and, eq } from "drizzle-orm";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  createIntegrationSchema,
  integrationIdParamsSchema,
  updateIntegrationSchema,
} from "../schemas/integration.schema";

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

export const integrationService = {
  async list(request: Request) {
    const orgId = requireOrg(request);
    return await db
      .select()
      .from(integrations)
      .where(eq(integrations.organizationId, orgId));
  },

  async create(request: Request) {
    const orgId = requireOrg(request);
    const body = createIntegrationSchema.parse(readValidatedBody(request));

    const [record] = await db
      .insert(integrations)
      .values({
        organizationId: orgId,
        provider: body.provider,
        name: body.name,
        status: "disconnected",
        config: body.config ?? null,
      })
      .returning();

    return record;
  },

  async get(request: Request) {
    const orgId = requireOrg(request);
    const params = integrationIdParamsSchema.parse(
      readValidatedParams(request),
    );

    const [record] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.id, params.integrationId),
          eq(integrations.organizationId, orgId),
        ),
      );

    if (!record) {
      throw notFound("Integration not found");
    }

    return record;
  },

  async update(request: Request) {
    const orgId = requireOrg(request);
    const params = integrationIdParamsSchema.parse(
      readValidatedParams(request),
    );
    const body = updateIntegrationSchema.parse(readValidatedBody(request));

    const [record] = await db
      .update(integrations)
      .set({
        ...body,
        lastSyncAt:
          body.lastSyncAt === undefined
            ? undefined
            : body.lastSyncAt
              ? new Date(body.lastSyncAt)
              : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(integrations.id, params.integrationId),
          eq(integrations.organizationId, orgId),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Integration not found");
    }

    return record;
  },

  async disconnect(request: Request) {
    const orgId = requireOrg(request);
    const params = integrationIdParamsSchema.parse(
      readValidatedParams(request),
    );

    const [record] = await db
      .update(integrations)
      .set({ status: "disconnected", updatedAt: new Date() })
      .where(
        and(
          eq(integrations.id, params.integrationId),
          eq(integrations.organizationId, orgId),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Integration not found");
    }

    return record;
  },
};
