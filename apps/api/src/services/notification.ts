import { integrations, notifications, users } from "@foreman/db";
import { and, count, eq, isNull } from "drizzle-orm";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import { enqueueNotificationDelivery } from "../lib/queues";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  createNotificationSchema,
  notificationIdParamsSchema,
  updateNotificationPreferencesSchema,
} from "../schemas/notification.schema";

const NOTIFICATION_PREF_PROVIDER = "internal_notifications";

interface NotificationPreferenceChannels {
  inApp: boolean;
  email: boolean;
}

interface NotificationPreferences {
  defaults: NotificationPreferenceChannels;
  events: Record<string, NotificationPreferenceChannels>;
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  defaults: {
    inApp: true,
    email: true,
  },
  events: {},
};

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

function preferenceIntegrationName(userId: string) {
  return `user:${userId}`;
}

function normalizeNotificationPreferences(
  raw: unknown,
): NotificationPreferences {
  const config =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const defaultsRaw =
    config.defaults &&
    typeof config.defaults === "object" &&
    !Array.isArray(config.defaults)
      ? (config.defaults as Record<string, unknown>)
      : {};

  const defaults: NotificationPreferenceChannels = {
    inApp:
      typeof defaultsRaw.inApp === "boolean"
        ? defaultsRaw.inApp
        : DEFAULT_NOTIFICATION_PREFERENCES.defaults.inApp,
    email:
      typeof defaultsRaw.email === "boolean"
        ? defaultsRaw.email
        : DEFAULT_NOTIFICATION_PREFERENCES.defaults.email,
  };

  const eventsRaw =
    config.events &&
    typeof config.events === "object" &&
    !Array.isArray(config.events)
      ? (config.events as Record<string, unknown>)
      : {};

  const events: Record<string, NotificationPreferenceChannels> = {};
  for (const [eventType, value] of Object.entries(eventsRaw)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }

    const eventConfig = value as Record<string, unknown>;
    events[eventType] = {
      inApp:
        typeof eventConfig.inApp === "boolean"
          ? eventConfig.inApp
          : defaults.inApp,
      email:
        typeof eventConfig.email === "boolean"
          ? eventConfig.email
          : defaults.email,
    };
  }

  return {
    defaults,
    events,
  };
}

async function loadPreferences(orgId: string, userId: string) {
  const [record] = await db
    .select({ config: integrations.config, updatedAt: integrations.updatedAt })
    .from(integrations)
    .where(
      and(
        eq(integrations.organizationId, orgId),
        eq(integrations.provider, NOTIFICATION_PREF_PROVIDER),
        eq(integrations.name, preferenceIntegrationName(userId)),
      ),
    )
    .limit(1);

  return {
    preferences: normalizeNotificationPreferences(record?.config),
    updatedAt: record?.updatedAt ?? null,
  };
}

function mergePreferences(
  current: NotificationPreferences,
  updates: Partial<NotificationPreferences>,
) {
  return {
    defaults: updates.defaults ?? current.defaults,
    events: {
      ...current.events,
      ...(updates.events ?? {}),
    },
  } satisfies NotificationPreferences;
}

export const notificationService = {
  async listMine(request: Request) {
    const { orgId, userId } = requireContext(request);
    return await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, orgId),
          eq(notifications.userId, userId),
        ),
      );
  },

  async unreadCount(request: Request) {
    const { orgId, userId } = requireContext(request);

    const [row] = await db
      .select({ total: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, orgId),
          eq(notifications.userId, userId),
          isNull(notifications.readAt),
        ),
      );

    return {
      unreadCount: Number(row?.total ?? 0),
    };
  },

  async getPreferences(request: Request) {
    const { orgId, userId } = requireContext(request);
    const { preferences, updatedAt } = await loadPreferences(orgId, userId);

    return {
      ...preferences,
      updatedAt,
    };
  },

  async updatePreferences(request: Request) {
    const { orgId, userId } = requireContext(request);
    const body = updateNotificationPreferencesSchema.parse(
      readValidatedBody(request),
    );
    const current = await loadPreferences(orgId, userId);

    const next = mergePreferences(current.preferences, {
      defaults: body.defaults,
      events: body.events,
    });

    const [record] = await db
      .insert(integrations)
      .values({
        organizationId: orgId,
        provider: NOTIFICATION_PREF_PROVIDER,
        name: preferenceIntegrationName(userId),
        status: "connected",
        config: next,
      })
      .onConflictDoUpdate({
        target: [
          integrations.organizationId,
          integrations.provider,
          integrations.name,
        ],
        set: {
          status: "connected",
          config: next,
          updatedAt: new Date(),
        },
      })
      .returning({ updatedAt: integrations.updatedAt });

    return {
      ...next,
      updatedAt: record?.updatedAt ?? new Date(),
    };
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

    const [recipient] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);

    if (recipient?.email) {
      await enqueueNotificationDelivery({
        toEmail: recipient.email,
        toUserId: input.userId,
        subject: input.title,
        body: input.message,
        notificationId: record.id,
      });
    }

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
    const params = notificationIdParamsSchema.parse(
      readValidatedParams(request),
    );

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
    const params = notificationIdParamsSchema.parse(
      readValidatedParams(request),
    );

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
