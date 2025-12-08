import { and, eq } from "drizzle-orm";
import { smartMailAccounts, smartMailMessages, smartMailThreads } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  createSmartMailAccountSchema,
  createSmartMailMessageSchema,
  createSmartMailThreadSchema,
  listSmartMailThreadsQuerySchema,
  smartMailAccountIdParamsSchema,
  smartMailThreadIdParamsSchema,
  updateSmartMailAccountSchema,
} from "../schemas/smartmail.schema";

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

export const smartMailService = {
  async listAccounts(request: Request) {
    const { orgId } = requireContext(request);
    return await db.select().from(smartMailAccounts).where(eq(smartMailAccounts.organizationId, orgId));
  },

  async createAccount(request: Request) {
    const { orgId, userId } = requireContext(request);
    const body = createSmartMailAccountSchema.parse(readValidatedBody(request));

    const [record] = await db
      .insert(smartMailAccounts)
      .values({
        organizationId: orgId,
        userId,
        provider: body.provider,
        email: body.email,
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
        metadata: body.metadata,
      })
      .returning();

    return record;
  },

  async updateAccount(request: Request) {
    const { orgId } = requireContext(request);
    const params = smartMailAccountIdParamsSchema.parse(readValidatedParams(request));
    const body = updateSmartMailAccountSchema.parse(readValidatedBody(request));

    const [record] = await db
      .update(smartMailAccounts)
      .set({
        status: body.status,
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
        metadata: body.metadata,
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(smartMailAccounts.id, params.accountId), eq(smartMailAccounts.organizationId, orgId)))
      .returning();

    if (!record) {
      throw notFound("SmartMail account not found");
    }

    return record;
  },

  async listThreads(request: Request) {
    const { orgId } = requireContext(request);
    const query = listSmartMailThreadsQuerySchema.parse(readValidatedQuery(request));

    return await db
      .select()
      .from(smartMailThreads)
      .where(and(eq(smartMailThreads.organizationId, orgId), eq(smartMailThreads.projectId, query.projectId)));
  },

  async createThread(request: Request) {
    const { orgId } = requireContext(request);
    const body = createSmartMailThreadSchema.parse(readValidatedBody(request));

    const [record] = await db
      .insert(smartMailThreads)
      .values({
        organizationId: orgId,
        projectId: body.projectId,
        subject: body.subject,
        externalThreadId: body.externalThreadId,
      })
      .returning();

    return record;
  },

  async listMessages(request: Request) {
    const { orgId } = requireContext(request);
    const params = smartMailThreadIdParamsSchema.parse(readValidatedParams(request));

    const [thread] = await db
      .select()
      .from(smartMailThreads)
      .where(and(eq(smartMailThreads.id, params.threadId), eq(smartMailThreads.organizationId, orgId)));

    if (!thread) {
      throw notFound("SmartMail thread not found");
    }

    return await db.select().from(smartMailMessages).where(eq(smartMailMessages.threadId, thread.id));
  },

  async createMessage(request: Request) {
    const { orgId } = requireContext(request);
    const params = smartMailThreadIdParamsSchema.parse(readValidatedParams(request));
    const body = createSmartMailMessageSchema.parse(readValidatedBody(request));

    const [thread] = await db
      .select()
      .from(smartMailThreads)
      .where(and(eq(smartMailThreads.id, params.threadId), eq(smartMailThreads.organizationId, orgId)));

    if (!thread) {
      throw notFound("SmartMail thread not found");
    }

    const [record] = await db
      .insert(smartMailMessages)
      .values({
        threadId: thread.id,
        organizationId: orgId,
        projectId: body.projectId,
        fromEmail: body.fromEmail,
        toEmail: body.toEmail,
        body: body.body,
        linkedEntityType: body.linkedEntityType,
        linkedEntityId: body.linkedEntityId,
        aiDraft: body.aiDraft ? 1 : 0,
        sentAt: body.sentAt ? new Date(body.sentAt) : undefined,
      })
      .returning();

    await db
      .update(smartMailThreads)
      .set({ updatedAt: new Date() })
      .where(and(eq(smartMailThreads.id, thread.id), eq(smartMailThreads.organizationId, orgId)));

    return record;
  },
};
