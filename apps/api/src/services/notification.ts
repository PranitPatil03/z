import { and, eq } from "drizzle-orm";
import { notifications } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import { enqueueNotificationDelivery } from "../lib/queues";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import { createNotificationSchema, notificationIdParamsSchema } from "../schemas/notification.schema";

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
  return { orgId: session.activeOrganizationId, userId: user.id };
}

export const notificationService = {
  async listMine(request: Request) {
    const { orgId, userId } = requireContext(request);
    return await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.organizationId, orgId), eq(notifications.userId, userId)));
  },

  async create(input: {
    organizationId: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown> | null;
  }) {
    const [record] = await db
      .insert(notifications)
      .values({
        organizationId: input.organizationId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.message,
        metadata: input.metadata ?? null,
      })
      .returning();

    await enqueueNotificationDelivery({
      to: input.userId,
      subject: input.title,
      body: input.message,
    });

    return record;
  },

  async createFromRequest(request: Request) {
    const { orgId } = requireContext(request);
    const body = createNotificationSchema.parse(readValidatedBody(request));

    return this.create({
      organizationId: orgId,
      userId: body.userId,
      type: body.type,
      title: body.title,
      message: body.body,
      metadata: body.metadata ?? null,
    });
  },

  async markAsRead(request: Request) {
    const { orgId, userId } = requireContext(request);
    const params = notificationIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, params.notificationId),
          eq(notifications.organizationId, orgId),
          eq(notifications.userId, userId),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Notification not found");
    }

    return record;
  },

  async remove(request: Request) {
    const { orgId, userId } = requireContext(request);
    const params = notificationIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, params.notificationId),
          eq(notifications.organizationId, orgId),
          eq(notifications.userId, userId),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Notification not found");
    }

    return record;
  },
};
