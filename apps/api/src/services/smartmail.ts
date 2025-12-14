import { type LlmProviderName, generateAiCompletion } from "@foreman/ai";
import {
  changeOrders,
  invoices,
  purchaseOrders,
  smartMailAccounts,
  smartMailMessages,
  smartMailSyncRuns,
  smartMailTemplates,
  smartMailThreads,
  subcontractors,
} from "@foreman/db";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import type { Request } from "express";
import { env } from "../config/env";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  createSmartMailAccountSchema,
  createSmartMailDraftSchema,
  createSmartMailMessageSchema,
  createSmartMailTemplateSchema,
  createSmartMailThreadSchema,
  listSmartMailTemplatesQuerySchema,
  listSmartMailThreadsQuerySchema,
  smartMailAccountIdParamsSchema,
  smartMailMessageIdParamsSchema,
  smartMailTemplateIdParamsSchema,
  smartMailThreadIdParamsSchema,
  syncSmartMailAccountSchema,
  updateSmartMailAccountSchema,
  updateSmartMailMessageLinkSchema,
  updateSmartMailTemplateSchema,
} from "../schemas/smartmail.schema";
import { entitlementsService } from "./entitlements";
import {
  type SmartMailLinkedEntityType,
  detectDeterministicEntityLink,
} from "./smartmail-linking";
import {
  type OAuthProviderConfig,
  type SmartMailProvider,
  decryptOpaqueToken,
  encryptOpaqueToken,
  exchangeGoogleCode,
  exchangeOutlookCode,
  fetchProviderMessages,
  refreshProviderAccessToken,
  sendProviderMessage,
} from "./smartmail-provider";

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

  return {
    orgId: session.activeOrganizationId,
    userId: user.id,
  };
}

function providerConfig(): OAuthProviderConfig {
  return {
    googleClientId: env.GOOGLE_CLIENT_ID,
    googleClientSecret: env.GOOGLE_CLIENT_SECRET,
    outlookClientId: env.OUTLOOK_CLIENT_ID,
    outlookClientSecret: env.OUTLOOK_CLIENT_SECRET,
    redirectUri:
      env.OAUTH_REDIRECT_URI || "http://localhost:3001/auth/oauth/callback",
  };
}

function encryptionKey() {
  if (!env.ENCRYPTION_KEY) {
    throw badRequest(
      "ENCRYPTION_KEY is required for SmartMail token operations",
    );
  }

  return env.ENCRYPTION_KEY;
}

function asProvider(value: string): SmartMailProvider {
  if (value === "gmail" || value === "outlook") {
    return value;
  }

  throw badRequest(`Unsupported SmartMail provider: ${value}`);
}

function sanitizeAccount(record: typeof smartMailAccounts.$inferSelect) {
  return {
    id: record.id,
    organizationId: record.organizationId,
    userId: record.userId,
    provider: record.provider,
    email: record.email,
    status: record.status,
    tokenExpiresAt: record.tokenExpiresAt,
    connectedAt: record.connectedAt,
    lastSyncAt: record.lastSyncAt,
    syncCursor: record.syncCursor,
    lastSyncStatus: record.lastSyncStatus,
    lastSyncError: record.lastSyncError,
    autoSyncEnabled: record.autoSyncEnabled,
    defaultProjectId: record.defaultProjectId,
    revokedAt: record.revokedAt,
    metadata: record.metadata,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function loadAccountOrThrow(orgId: string, accountId: string) {
  const [account] = await db
    .select()
    .from(smartMailAccounts)
    .where(
      and(
        eq(smartMailAccounts.id, accountId),
        eq(smartMailAccounts.organizationId, orgId),
      ),
    );

  if (!account) {
    throw notFound("SmartMail account not found");
  }

  return account;
}

async function loadThreadOrThrow(orgId: string, threadId: string) {
  const [thread] = await db
    .select()
    .from(smartMailThreads)
    .where(
      and(
        eq(smartMailThreads.id, threadId),
        eq(smartMailThreads.organizationId, orgId),
      ),
    );

  if (!thread) {
    throw notFound("SmartMail thread not found");
  }

  return thread;
}

function resolveProjectIdForSync(
  account: typeof smartMailAccounts.$inferSelect,
  requestedProjectId?: string,
) {
  const projectId = requestedProjectId ?? account.defaultProjectId ?? undefined;
  if (!projectId) {
    throw badRequest(
      "projectId is required when account.defaultProjectId is not configured",
    );
  }
  return projectId;
}

async function resolveValidAccessToken(
  account: typeof smartMailAccounts.$inferSelect,
  forceRefresh = false,
) {
  if (!account.accessToken) {
    throw badRequest("Account access token is missing");
  }

  const key = encryptionKey();
  const provider = asProvider(account.provider);
  const now = new Date();
  const expiresSoon =
    account.tokenExpiresAt !== null &&
    account.tokenExpiresAt !== undefined &&
    account.tokenExpiresAt.getTime() <= now.getTime() + 90_000;

  if (!forceRefresh && !expiresSoon) {
    return {
      accessToken: decryptOpaqueToken(account.accessToken, key),
      account,
    };
  }

  if (!account.refreshToken) {
    throw badRequest("Account refresh token is missing; reconnect is required");
  }

  const refreshed = await refreshProviderAccessToken(
    provider,
    decryptOpaqueToken(account.refreshToken, key),
    providerConfig(),
  );

  const [updatedAccount] = await db
    .update(smartMailAccounts)
    .set({
      accessToken: encryptOpaqueToken(refreshed.accessToken, key),
      refreshToken: refreshed.refreshToken
        ? encryptOpaqueToken(refreshed.refreshToken, key)
        : account.refreshToken,
      tokenExpiresAt: refreshed.expiresAt,
      status: "connected",
      lastSyncError: null,
      updatedAt: new Date(),
    })
    .where(eq(smartMailAccounts.id, account.id))
    .returning();

  if (!updatedAccount) {
    throw notFound("SmartMail account not found while refreshing token");
  }

  return {
    accessToken: refreshed.accessToken,
    account: updatedAccount,
  };
}

async function loadLinkInputs(orgId: string, projectId: string) {
  const [poRows, invoiceRows, changeOrderRows, subcontractorRows] =
    await Promise.all([
      db
        .select({ id: purchaseOrders.id, ref: purchaseOrders.poNumber })
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.organizationId, orgId),
            eq(purchaseOrders.projectId, projectId),
            isNull(purchaseOrders.deletedAt),
          ),
        ),
      db
        .select({ id: invoices.id, ref: invoices.invoiceNumber })
        .from(invoices)
        .where(
          and(
            eq(invoices.organizationId, orgId),
            eq(invoices.projectId, projectId),
            isNull(invoices.deletedAt),
          ),
        ),
      db
        .select({ id: changeOrders.id, ref: changeOrders.title })
        .from(changeOrders)
        .where(
          and(
            eq(changeOrders.organizationId, orgId),
            eq(changeOrders.projectId, projectId),
          ),
        ),
      db
        .select({
          id: subcontractors.id,
          name: subcontractors.name,
          email: subcontractors.email,
        })
        .from(subcontractors)
        .where(
          and(
            eq(subcontractors.organizationId, orgId),
            eq(subcontractors.projectId, projectId),
            isNull(subcontractors.deletedAt),
          ),
        ),
    ]);

  return {
    purchaseOrders: poRows,
    invoices: invoiceRows,
    changeOrders: changeOrderRows,
    subcontractors: subcontractorRows.flatMap((row) => {
      const refs = [{ id: row.id, ref: row.name }];
      if (row.email) {
        refs.push({ id: row.id, ref: row.email });
      }
      return refs;
    }),
  };
}

async function upsertThread(input: {
  orgId: string;
  projectId: string;
  accountId: string;
  subject: string;
  externalThreadId?: string;
  participants: string[];
  linkedEntityType?: SmartMailLinkedEntityType | null;
  linkedEntityId?: string | null;
  lastMessageAt?: Date;
}) {
  if (!input.externalThreadId) {
    const [thread] = await db
      .insert(smartMailThreads)
      .values({
        organizationId: input.orgId,
        projectId: input.projectId,
        accountId: input.accountId,
        subject: input.subject,
        participants: input.participants,
        linkedEntityType: input.linkedEntityType,
        linkedEntityId: input.linkedEntityId,
        lastMessageAt: input.lastMessageAt,
      })
      .returning();

    return thread;
  }

  const [thread] = await db
    .insert(smartMailThreads)
    .values({
      organizationId: input.orgId,
      projectId: input.projectId,
      accountId: input.accountId,
      subject: input.subject,
      externalThreadId: input.externalThreadId,
      participants: input.participants,
      linkedEntityType: input.linkedEntityType,
      linkedEntityId: input.linkedEntityId,
      lastMessageAt: input.lastMessageAt,
    })
    .onConflictDoUpdate({
      target: [
        smartMailThreads.organizationId,
        smartMailThreads.accountId,
        smartMailThreads.externalThreadId,
      ],
      set: {
        projectId: input.projectId,
        subject: input.subject,
        participants: input.participants,
        linkedEntityType: input.linkedEntityType,
        linkedEntityId: input.linkedEntityId,
        lastMessageAt: input.lastMessageAt,
        updatedAt: new Date(),
      },
    })
    .returning();

  return thread;
}

function toPrimaryToEmail(toEmails: string[]) {
  return toEmails[0] ?? "";
}

function buildDeterministicLinkText(
  subject: string,
  body: string,
  fromEmail: string,
  toEmails: string[],
) {
  return [subject, body, fromEmail, toEmails.join(" ")]
    .filter(Boolean)
    .join("\n");
}

async function runSmartMailSync(input: {
  orgId: string;
  accountId: string;
  projectId?: string;
  maxResults: number;
  forceRefresh?: boolean;
}) {
  await entitlementsService.assertFeatureAccess(input.orgId, "smartmail.sync");
  const account = await loadAccountOrThrow(input.orgId, input.accountId);
  const projectId = resolveProjectIdForSync(account, input.projectId);

  const [syncRun] = await db
    .insert(smartMailSyncRuns)
    .values({
      accountId: account.id,
      organizationId: input.orgId,
      projectId,
      status: "running",
      cursorBefore: account.syncCursor,
      startedAt: new Date(),
    })
    .returning();

  try {
    const { accessToken, account: latestAccount } =
      await resolveValidAccessToken(account, input.forceRefresh ?? false);

    const lookbackMinutes = Number(env.SMARTMAIL_SYNC_LOOKBACK_MINUTES ?? "30");
    const since = latestAccount.lastSyncAt
      ? new Date(
          latestAccount.lastSyncAt.getTime() -
            Math.max(0, lookbackMinutes) * 60_000,
        )
      : undefined;

    const rows = await fetchProviderMessages({
      provider: asProvider(latestAccount.provider),
      accessToken,
      accountEmail: latestAccount.email,
      maxResults: input.maxResults,
      since,
    });

    const linkInputs = await loadLinkInputs(input.orgId, projectId);
    let upsertedCount = 0;
    let latestCursor: Date | null = null;

    for (const row of rows) {
      const autoLink = detectDeterministicEntityLink(
        buildDeterministicLinkText(
          row.subject,
          row.body,
          row.fromEmail,
          row.toEmails,
        ),
        linkInputs,
      );

      const thread = await upsertThread({
        orgId: input.orgId,
        projectId,
        accountId: latestAccount.id,
        subject: row.subject,
        externalThreadId: row.externalThreadId,
        participants: Array.from(
          new Set(
            [row.fromEmail, ...row.toEmails, ...row.ccEmails].filter(Boolean),
          ),
        ),
        linkedEntityType: autoLink?.linkedEntityType ?? null,
        linkedEntityId: autoLink?.linkedEntityId ?? null,
        lastMessageAt: row.sentAt,
      });

      const [existing] = await db
        .select()
        .from(smartMailMessages)
        .where(
          and(
            eq(smartMailMessages.organizationId, input.orgId),
            eq(smartMailMessages.externalMessageId, row.externalMessageId),
          ),
        );

      const preserveManualLink = Boolean(existing?.linkOverriddenAt);

      if (existing) {
        await db
          .update(smartMailMessages)
          .set({
            threadId: thread.id,
            projectId,
            direction: row.direction,
            status: "received",
            fromEmail: row.fromEmail,
            toEmail: toPrimaryToEmail(row.toEmails),
            ccEmails: row.ccEmails,
            subject: row.subject,
            body: row.body,
            linkedEntityType: preserveManualLink
              ? existing.linkedEntityType
              : (autoLink?.linkedEntityType ?? null),
            linkedEntityId: preserveManualLink
              ? existing.linkedEntityId
              : (autoLink?.linkedEntityId ?? null),
            linkConfidenceBps: preserveManualLink
              ? existing.linkConfidenceBps
              : (autoLink?.confidenceBps ?? 0),
            linkReason: preserveManualLink
              ? existing.linkReason
              : (autoLink?.reason ?? null),
            providerMetadata: row.providerMetadata,
            externalCreatedAt: row.sentAt,
            sentAt: row.sentAt,
            updatedAt: new Date(),
          })
          .where(eq(smartMailMessages.id, existing.id));
      } else {
        await db.insert(smartMailMessages).values({
          threadId: thread.id,
          organizationId: input.orgId,
          projectId,
          externalMessageId: row.externalMessageId,
          direction: row.direction,
          status: "received",
          fromEmail: row.fromEmail,
          toEmail: toPrimaryToEmail(row.toEmails),
          ccEmails: row.ccEmails,
          subject: row.subject,
          body: row.body,
          linkedEntityType: autoLink?.linkedEntityType,
          linkedEntityId: autoLink?.linkedEntityId,
          linkConfidenceBps: autoLink?.confidenceBps ?? 0,
          linkReason: autoLink?.reason,
          providerMetadata: row.providerMetadata,
          externalCreatedAt: row.sentAt,
          sentAt: row.sentAt,
        });
      }

      upsertedCount += 1;
      if (!latestCursor || row.sentAt.getTime() > latestCursor.getTime()) {
        latestCursor = row.sentAt;
      }
    }

    const now = new Date();
    const cursorValue = latestCursor
      ? latestCursor.toISOString()
      : latestAccount.syncCursor;

    await db
      .update(smartMailAccounts)
      .set({
        status: "connected",
        lastSyncAt: now,
        syncCursor: cursorValue,
        lastSyncStatus: "ok",
        lastSyncError: null,
        updatedAt: now,
      })
      .where(eq(smartMailAccounts.id, latestAccount.id));

    await db
      .update(smartMailSyncRuns)
      .set({
        status: "success",
        fetchedCount: rows.length,
        upsertedCount,
        cursorAfter: cursorValue,
        completedAt: now,
      })
      .where(eq(smartMailSyncRuns.id, syncRun.id));

    return {
      accountId: latestAccount.id,
      projectId,
      fetchedCount: rows.length,
      upsertedCount,
      cursor: cursorValue,
      syncedAt: now,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown sync error";
    const now = new Date();

    await db
      .update(smartMailAccounts)
      .set({
        status: message.includes("401") ? "error" : account.status,
        lastSyncStatus: "failed",
        lastSyncError: message,
        updatedAt: now,
      })
      .where(eq(smartMailAccounts.id, account.id));

    await db
      .update(smartMailSyncRuns)
      .set({
        status: "failed",
        error: message,
        completedAt: now,
      })
      .where(eq(smartMailSyncRuns.id, syncRun.id));

    throw badRequest(`SmartMail sync failed: ${message}`);
  }
}

export const smartMailService = {
  async listAccounts(request: Request) {
    const { orgId } = requireContext(request);
    const records = await db
      .select()
      .from(smartMailAccounts)
      .where(eq(smartMailAccounts.organizationId, orgId));
    return records.map(sanitizeAccount);
  },

  async createAccount(request: Request) {
    const { orgId, userId } = requireContext(request);
    const body = createSmartMailAccountSchema.parse(readValidatedBody(request));
    await entitlementsService.assertSmartMailAccountAllowed(orgId);
    const key = env.ENCRYPTION_KEY;

    if ((body.accessToken || body.refreshToken) && !key) {
      throw badRequest("ENCRYPTION_KEY is required when storing OAuth tokens");
    }

    const [record] = await db
      .insert(smartMailAccounts)
      .values({
        organizationId: orgId,
        userId,
        provider: body.provider,
        email: body.email,
        accessToken:
          body.accessToken && key
            ? encryptOpaqueToken(body.accessToken, key)
            : null,
        refreshToken:
          body.refreshToken && key
            ? encryptOpaqueToken(body.refreshToken, key)
            : null,
        tokenExpiresAt: body.tokenExpiresAt
          ? new Date(body.tokenExpiresAt)
          : undefined,
        autoSyncEnabled: body.autoSyncEnabled,
        defaultProjectId: body.defaultProjectId,
        metadata: body.metadata,
      })
      .onConflictDoUpdate({
        target: [
          smartMailAccounts.organizationId,
          smartMailAccounts.provider,
          smartMailAccounts.email,
        ],
        set: {
          userId,
          accessToken:
            body.accessToken && key
              ? encryptOpaqueToken(body.accessToken, key)
              : undefined,
          refreshToken:
            body.refreshToken && key
              ? encryptOpaqueToken(body.refreshToken, key)
              : undefined,
          tokenExpiresAt: body.tokenExpiresAt
            ? new Date(body.tokenExpiresAt)
            : undefined,
          status: "connected",
          revokedAt: null,
          autoSyncEnabled: body.autoSyncEnabled,
          defaultProjectId: body.defaultProjectId,
          metadata: body.metadata,
          updatedAt: new Date(),
        },
      })
      .returning();

    return sanitizeAccount(record);
  },

  async updateAccount(request: Request) {
    const { orgId } = requireContext(request);
    const params = smartMailAccountIdParamsSchema.parse(
      readValidatedParams(request),
    );
    const body = updateSmartMailAccountSchema.parse(readValidatedBody(request));
    const key = env.ENCRYPTION_KEY;

    if ((body.accessToken || body.refreshToken) && !key) {
      throw badRequest("ENCRYPTION_KEY is required when storing OAuth tokens");
    }

    const [record] = await db
      .update(smartMailAccounts)
      .set({
        status: body.status,
        accessToken:
          body.accessToken && key
            ? encryptOpaqueToken(body.accessToken, key)
            : undefined,
        refreshToken:
          body.refreshToken && key
            ? encryptOpaqueToken(body.refreshToken, key)
            : undefined,
        tokenExpiresAt: body.tokenExpiresAt
          ? new Date(body.tokenExpiresAt)
          : undefined,
        autoSyncEnabled: body.autoSyncEnabled,
        defaultProjectId: body.defaultProjectId,
        revokedAt: body.status === "disconnected" ? new Date() : undefined,
        metadata: body.metadata,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(smartMailAccounts.id, params.accountId),
          eq(smartMailAccounts.organizationId, orgId),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("SmartMail account not found");
    }

    return sanitizeAccount(record);
  },

  async syncAccount(request: Request) {
    const { orgId } = requireContext(request);
    const params = smartMailAccountIdParamsSchema.parse(
      readValidatedParams(request),
    );
    const body = syncSmartMailAccountSchema.parse(readValidatedBody(request));

    return await runSmartMailSync({
      orgId,
      accountId: params.accountId,
      projectId: body.projectId,
      maxResults: body.maxResults,
    });
  },

  async syncAccountByInput(input: {
    orgId: string;
    accountId: string;
    projectId?: string;
    maxResults: number;
    forceRefresh?: boolean;
  }) {
    return await runSmartMailSync(input);
  },

  async listThreads(request: Request) {
    const { orgId } = requireContext(request);
    const query = listSmartMailThreadsQuerySchema.parse(
      readValidatedQuery(request),
    );

    const conditions = [
      eq(smartMailThreads.organizationId, orgId),
      eq(smartMailThreads.projectId, query.projectId),
    ];

    if (query.accountId) {
      conditions.push(eq(smartMailThreads.accountId, query.accountId));
    }

    return await db
      .select()
      .from(smartMailThreads)
      .where(and(...conditions))
      .orderBy(desc(smartMailThreads.updatedAt));
  },

  async createThread(request: Request) {
    const { orgId } = requireContext(request);
    const body = createSmartMailThreadSchema.parse(readValidatedBody(request));

    await loadAccountOrThrow(orgId, body.accountId);

    const [record] = await db
      .insert(smartMailThreads)
      .values({
        organizationId: orgId,
        projectId: body.projectId,
        accountId: body.accountId,
        subject: body.subject,
        externalThreadId: body.externalThreadId,
        linkedEntityType: body.linkedEntityType,
        linkedEntityId: body.linkedEntityId,
      })
      .returning();

    return record;
  },

  async listMessages(request: Request) {
    const { orgId } = requireContext(request);
    const params = smartMailThreadIdParamsSchema.parse(
      readValidatedParams(request),
    );

    await loadThreadOrThrow(orgId, params.threadId);

    return await db
      .select()
      .from(smartMailMessages)
      .where(eq(smartMailMessages.threadId, params.threadId))
      .orderBy(
        desc(smartMailMessages.sentAt),
        desc(smartMailMessages.createdAt),
      );
  },

  async createMessage(request: Request) {
    const { orgId } = requireContext(request);
    const params = smartMailThreadIdParamsSchema.parse(
      readValidatedParams(request),
    );
    const body = createSmartMailMessageSchema.parse(readValidatedBody(request));
    const thread = await loadThreadOrThrow(orgId, params.threadId);
    const account = await loadAccountOrThrow(orgId, body.accountId);

    if (thread.accountId !== account.id) {
      throw badRequest("Thread accountId does not match the selected account");
    }

    const subject = body.subject ?? thread.subject;
    const linkInputs = await loadLinkInputs(orgId, body.projectId);
    const autoLink =
      body.linkedEntityType && body.linkedEntityId
        ? {
            linkedEntityType: body.linkedEntityType,
            linkedEntityId: body.linkedEntityId,
            confidenceBps: 10000,
            reason: "Linked manually at send time",
          }
        : detectDeterministicEntityLink(
            buildDeterministicLinkText(
              subject,
              body.body,
              account.email,
              body.toEmails,
            ),
            linkInputs,
          );

    let status: "draft" | "sent" | "failed" = body.sendNow ? "sent" : "draft";
    let externalMessageId: string | undefined;
    let externalThreadId: string | undefined;
    let providerMetadata: Record<string, unknown> | null = null;
    let sendError: string | undefined;
    let sentAt = body.sentAt
      ? new Date(body.sentAt)
      : body.sendNow
        ? new Date()
        : undefined;

    if (body.sendNow) {
      try {
        const { accessToken } = await resolveValidAccessToken(account);
        const providerResult = await sendProviderMessage({
          provider: asProvider(account.provider),
          accessToken,
          fromEmail: account.email,
          toEmails: body.toEmails,
          ccEmails: body.ccEmails,
          subject,
          body: body.body,
          inReplyToMessageId: body.inReplyToMessageId,
        });

        externalMessageId = providerResult.externalMessageId;
        externalThreadId = providerResult.externalThreadId;
        providerMetadata = providerResult.providerMetadata;
        sentAt = providerResult.sentAt;
      } catch (error) {
        status = "failed";
        sendError =
          error instanceof Error
            ? error.message
            : "Unknown provider send error";
      }
    }

    const [record] = await db
      .insert(smartMailMessages)
      .values({
        threadId: thread.id,
        organizationId: orgId,
        projectId: body.projectId,
        externalMessageId,
        direction: "outbound",
        status,
        fromEmail: account.email,
        toEmail: toPrimaryToEmail(body.toEmails),
        ccEmails: body.ccEmails,
        subject,
        body: body.body,
        linkedEntityType: autoLink?.linkedEntityType,
        linkedEntityId: autoLink?.linkedEntityId,
        linkConfidenceBps: autoLink?.confidenceBps ?? 0,
        linkReason: autoLink?.reason,
        aiDraft: body.aiDraft ? 1 : 0,
        isAiDraft: body.aiDraft,
        sendError,
        providerMetadata,
        externalCreatedAt: sentAt,
        sentAt,
      })
      .returning();

    await db
      .update(smartMailThreads)
      .set({
        subject,
        externalThreadId: thread.externalThreadId ?? externalThreadId,
        linkedEntityType: thread.linkedEntityType ?? autoLink?.linkedEntityType,
        linkedEntityId: thread.linkedEntityId ?? autoLink?.linkedEntityId,
        lastMessageAt: sentAt,
        updatedAt: new Date(),
      })
      .where(eq(smartMailThreads.id, thread.id));

    return record;
  },

  async createDraft(request: Request) {
    const { orgId } = requireContext(request);
    await entitlementsService.assertFeatureAccess(orgId, "smartmail.ai_draft");
    const params = smartMailThreadIdParamsSchema.parse(
      readValidatedParams(request),
    );
    const body = createSmartMailDraftSchema.parse(readValidatedBody(request));
    const thread = await loadThreadOrThrow(orgId, params.threadId);
    const account = await loadAccountOrThrow(orgId, body.accountId);

    if (thread.accountId !== account.id) {
      throw badRequest("Thread accountId does not match the selected account");
    }

    const [template] = body.templateId
      ? await db
          .select()
          .from(smartMailTemplates)
          .where(
            and(
              eq(smartMailTemplates.id, body.templateId),
              eq(smartMailTemplates.organizationId, orgId),
              isNull(smartMailTemplates.deletedAt),
            ),
          )
      : [undefined];

    const recentMessages = await db
      .select({
        subject: smartMailMessages.subject,
        body: smartMailMessages.body,
        fromEmail: smartMailMessages.fromEmail,
      })
      .from(smartMailMessages)
      .where(eq(smartMailMessages.threadId, thread.id))
      .orderBy(desc(smartMailMessages.createdAt))
      .limit(5);

    const prompt = [
      "Draft a concise project communication email.",
      body.tone ? `Tone: ${body.tone}` : "Tone: professional and clear",
      `Thread subject: ${thread.subject}`,
      template ? `Template body:\n${template.bodyTemplate}` : "",
      `User instruction: ${body.prompt}`,
      recentMessages.length > 0
        ? `Recent context:\n${recentMessages
            .map(
              (message, index) =>
                `${index + 1}. From ${message.fromEmail}: ${message.subject}\n${message.body}`,
            )
            .join("\n\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const usageUnits = entitlementsService.estimateAiUnits(prompt);
    const subscription = await entitlementsService.assertAiUsageAllowed(
      orgId,
      usageUnits,
    );

    const completion = await generateAiCompletion(
      {
        provider: body.provider as LlmProviderName | undefined,
        model: body.model ?? "gpt-4.1-mini",
        prompt,
      },
      {
        openaiApiKey: env.OPENAI_API_KEY,
        anthropicApiKey: env.ANTHROPIC_API_KEY,
        geminiApiKey: env.GEMINI_API_KEY,
        azureOpenAiApiKey: env.AZURE_OPENAI_API_KEY,
        azureOpenAiEndpoint: env.AZURE_OPENAI_ENDPOINT,
      },
    );

    const updatedSubscription = await entitlementsService.recordAiUsage({
      organizationId: orgId,
      subscriptionId: subscription.id,
      feature: "smartmail.ai_draft",
      units: usageUnits,
      source: "smartmail.ai_draft",
      model: completion.model,
      metadata: {
        provider: completion.provider,
        threadId: thread.id,
      },
    });

    const linkInputs = await loadLinkInputs(orgId, body.projectId);
    const autoLink =
      body.linkedEntityType && body.linkedEntityId
        ? {
            linkedEntityType: body.linkedEntityType,
            linkedEntityId: body.linkedEntityId,
            confidenceBps: 10000,
            reason: "Linked manually for AI draft",
          }
        : detectDeterministicEntityLink(
            `${thread.subject}\n${completion.output}`,
            linkInputs,
          );

    const [draftMessage] = await db
      .insert(smartMailMessages)
      .values({
        threadId: thread.id,
        organizationId: orgId,
        projectId: body.projectId,
        direction: "outbound",
        status: "draft",
        fromEmail: account.email,
        toEmail: "",
        subject: template?.subjectTemplate || thread.subject,
        body: completion.output,
        linkedEntityType: autoLink?.linkedEntityType,
        linkedEntityId: autoLink?.linkedEntityId,
        linkConfidenceBps: autoLink?.confidenceBps ?? 0,
        linkReason: autoLink?.reason,
        aiDraft: 1,
        isAiDraft: true,
        aiModel: completion.model,
        aiPromptTemplateVersion: template
          ? `${template.type}:${template.id}`
          : "manual:v1",
        providerMetadata: {
          provider: completion.provider,
          usageUnits,
        },
      })
      .returning();

    return {
      draft: completion.output,
      message: draftMessage,
      usage: {
        units: usageUnits,
        aiCreditsIncluded:
          updatedSubscription?.aiCreditsIncluded ??
          subscription.aiCreditsIncluded,
        aiCreditsUsed:
          updatedSubscription?.aiCreditsUsed ?? subscription.aiCreditsUsed,
      },
    };
  },

  async overrideMessageLink(request: Request) {
    const { orgId, userId } = requireContext(request);
    const params = smartMailMessageIdParamsSchema.parse(
      readValidatedParams(request),
    );
    const body = updateSmartMailMessageLinkSchema.parse(
      readValidatedBody(request),
    );

    const [message] = await db
      .select()
      .from(smartMailMessages)
      .where(
        and(
          eq(smartMailMessages.id, params.messageId),
          eq(smartMailMessages.organizationId, orgId),
        ),
      );

    if (!message) {
      throw notFound("SmartMail message not found");
    }

    if (!body.clear && (!body.linkedEntityType || !body.linkedEntityId)) {
      throw badRequest(
        "linkedEntityType and linkedEntityId are required when clear=false",
      );
    }

    const [updated] = await db
      .update(smartMailMessages)
      .set({
        linkedEntityType: body.clear ? null : body.linkedEntityType,
        linkedEntityId: body.clear ? null : body.linkedEntityId,
        linkConfidenceBps: body.clear ? 0 : 10000,
        linkReason: body.clear
          ? "Link manually cleared"
          : "Link manually overridden",
        linkOverriddenByUserId: userId,
        linkOverriddenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(smartMailMessages.id, message.id))
      .returning();

    return updated;
  },

  async listTemplates(request: Request) {
    const { orgId } = requireContext(request);
    const query = listSmartMailTemplatesQuerySchema.parse(
      readValidatedQuery(request),
    );

    const conditions = [
      eq(smartMailTemplates.organizationId, orgId),
      isNull(smartMailTemplates.deletedAt),
    ];

    if (query.projectId) {
      const projectScopeFilter = or(
        eq(smartMailTemplates.projectId, query.projectId),
        isNull(smartMailTemplates.projectId),
      );
      if (projectScopeFilter) {
        conditions.push(projectScopeFilter);
      }
    }

    if (query.type) {
      conditions.push(eq(smartMailTemplates.type, query.type));
    }

    return await db
      .select()
      .from(smartMailTemplates)
      .where(and(...conditions))
      .orderBy(desc(smartMailTemplates.updatedAt));
  },

  async createTemplate(request: Request) {
    const { orgId, userId } = requireContext(request);
    const body = createSmartMailTemplateSchema.parse(
      readValidatedBody(request),
    );

    const [record] = await db
      .insert(smartMailTemplates)
      .values({
        organizationId: orgId,
        projectId: body.projectId,
        createdByUserId: userId,
        name: body.name,
        type: body.type,
        subjectTemplate: body.subjectTemplate,
        bodyTemplate: body.bodyTemplate,
        variables: body.variables,
        isShared: body.isShared,
        metadata: body.metadata,
      })
      .returning();

    return record;
  },

  async updateTemplate(request: Request) {
    const { orgId } = requireContext(request);
    const params = smartMailTemplateIdParamsSchema.parse(
      readValidatedParams(request),
    );
    const body = updateSmartMailTemplateSchema.parse(
      readValidatedBody(request),
    );

    const [record] = await db
      .update(smartMailTemplates)
      .set({
        name: body.name,
        subjectTemplate: body.subjectTemplate,
        bodyTemplate: body.bodyTemplate,
        variables: body.variables,
        isShared: body.isShared,
        metadata: body.metadata,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(smartMailTemplates.id, params.templateId),
          eq(smartMailTemplates.organizationId, orgId),
          isNull(smartMailTemplates.deletedAt),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("SmartMail template not found");
    }

    return record;
  },

  async deleteTemplate(request: Request) {
    const { orgId } = requireContext(request);
    const params = smartMailTemplateIdParamsSchema.parse(
      readValidatedParams(request),
    );

    const [record] = await db
      .update(smartMailTemplates)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(smartMailTemplates.id, params.templateId),
          eq(smartMailTemplates.organizationId, orgId),
          isNull(smartMailTemplates.deletedAt),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("SmartMail template not found");
    }

    return { id: record.id, deletedAt: record.deletedAt };
  },

  async exchangeOAuthCode(input: {
    provider: SmartMailProvider;
    code: string;
  }) {
    if (input.provider === "gmail") {
      return await exchangeGoogleCode(input.code, providerConfig());
    }

    return await exchangeOutlookCode(input.code, providerConfig());
  },
};
