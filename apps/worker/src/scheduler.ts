import {
  changeOrders,
  complianceItems,
  createDb,
  notifications,
  organizationSubscriptions,
  smartMailAccounts,
  smartMailMessages,
  smartMailThreads,
  subcontractors,
} from "@foreman/db";
import { and, eq, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import type pino from "pino";
import {
  decryptOpaqueToken,
  encryptOpaqueToken,
  fetchProviderMessages,
  refreshProviderAccessToken,
} from "../../api/src/services/smartmail-provider";
import { sendNotificationEmail } from "./email";

interface SchedulerTask {
  name: string;
  intervalMs: number;
  run: () => Promise<Record<string, unknown>>;
}

function getIntervalMs(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getPositiveInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function getEncryptionKey() {
  return process.env.ENCRYPTION_KEY;
}

export function startScheduler(logger: pino.Logger) {
  const enabled = (process.env.SCHEDULER_ENABLED ?? "true") !== "false";
  if (!enabled) {
    logger.info("Scheduler disabled (SCHEDULER_ENABLED=false)");
    return () => {};
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("Scheduler skipped: DATABASE_URL is not configured");
    return () => {};
  }

  const db = createDb(databaseUrl);

  const tasks: SchedulerTask[] = [
    {
      name: "compliance-expiry",
      intervalMs: getIntervalMs(
        "SCHEDULER_COMPLIANCE_INTERVAL_MS",
        60 * 60 * 1000,
      ),
      run: async () => {
        const now = new Date();
        const expiringWindowDays = Number(
          process.env.SCHEDULER_COMPLIANCE_EXPIRING_DAYS ?? "14",
        );
        const reminderIntervalHours = Number(
          process.env.SCHEDULER_COMPLIANCE_REMINDER_INTERVAL_HOURS ?? "24",
        );
        const escalationIntervalHours = Number(
          process.env.SCHEDULER_COMPLIANCE_ESCALATION_INTERVAL_HOURS ?? "24",
        );
        const expiringCutoff = new Date(
          now.getTime() + expiringWindowDays * 24 * 60 * 60 * 1000,
        );

        const candidates = await db
          .select({
            id: complianceItems.id,
            organizationId: complianceItems.organizationId,
            projectId: complianceItems.projectId,
            subcontractorId: complianceItems.subcontractorId,
            complianceType: complianceItems.complianceType,
            status: complianceItems.status,
            dueDate: complianceItems.dueDate,
            reminderSentAt: complianceItems.reminderSentAt,
            escalationSentAt: complianceItems.escalationSentAt,
          })
          .from(complianceItems)
          .where(
            and(
              isNull(complianceItems.deletedAt),
              isNotNull(complianceItems.dueDate),
              lte(complianceItems.dueDate, expiringCutoff),
            ),
          );

        if (candidates.length === 0) {
          return {
            checked: 0,
            markedExpiring: 0,
            markedExpired: 0,
            remindersSent: 0,
            escalationsSent: 0,
          };
        }

        const subcontractorIds = Array.from(
          new Set(
            candidates
              .map((row) => row.subcontractorId)
              .filter((id): id is string => Boolean(id)),
          ),
        );
        const subcontractorRows = subcontractorIds.length
          ? await db
              .select({
                id: subcontractors.id,
                email: subcontractors.email,
                name: subcontractors.name,
              })
              .from(subcontractors)
              .where(
                and(
                  inArray(subcontractors.id, subcontractorIds),
                  isNull(subcontractors.deletedAt),
                ),
              )
          : [];
        const subcontractorById = new Map(
          subcontractorRows.map((row) => [row.id, row]),
        );

        const reminderIntervalMs = reminderIntervalHours * 60 * 60 * 1000;
        const escalationIntervalMs = escalationIntervalHours * 60 * 60 * 1000;
        let markedExpiring = 0;
        let markedExpired = 0;
        let remindersSent = 0;
        let escalationsSent = 0;

        for (const item of candidates) {
          if (!item.dueDate) {
            continue;
          }

          if (item.status === "verified" || item.status === "compliant") {
            continue;
          }

          const dueAt = item.dueDate.getTime();
          const isOverdue = dueAt <= now.getTime();

          if (isOverdue) {
            const shouldEscalate =
              !item.escalationSentAt ||
              now.getTime() - item.escalationSentAt.getTime() >=
                escalationIntervalMs;

            await db
              .update(complianceItems)
              .set({
                status: "expired",
                escalationSentAt: shouldEscalate ? now : item.escalationSentAt,
                updatedAt: now,
              })
              .where(eq(complianceItems.id, item.id));

            if (item.status !== "expired") {
              markedExpired += 1;
            }

            if (shouldEscalate && item.subcontractorId) {
              const subcontractor = subcontractorById.get(item.subcontractorId);
              if (subcontractor?.email) {
                await sendNotificationEmail({
                  toEmail: subcontractor.email,
                  subject: "anvil Compliance Escalation",
                  body: `Compliance requirement ${item.complianceType} is overdue for your project scope. Please upload evidence immediately to avoid payment delays.`,
                });
                escalationsSent += 1;
              }
            }

            continue;
          }

          const shouldRemind =
            !item.reminderSentAt ||
            now.getTime() - item.reminderSentAt.getTime() >= reminderIntervalMs;
          const nextStatus =
            item.status === "pending" ? "expiring" : item.status;

          await db
            .update(complianceItems)
            .set({
              status: nextStatus,
              reminderSentAt: shouldRemind ? now : item.reminderSentAt,
              updatedAt: now,
            })
            .where(eq(complianceItems.id, item.id));

          if (item.status === "pending" && nextStatus === "expiring") {
            markedExpiring += 1;
          }

          if (shouldRemind && item.subcontractorId) {
            const subcontractor = subcontractorById.get(item.subcontractorId);
            if (subcontractor?.email) {
              await sendNotificationEmail({
                toEmail: subcontractor.email,
                subject: "anvil Compliance Reminder",
                body: `Compliance requirement ${item.complianceType} is approaching its due date. Upload your documentation in the SubConnect portal to stay compliant.`,
              });
              remindersSent += 1;
            }
          }
        }

        return {
          checked: candidates.length,
          markedExpiring,
          markedExpired,
          remindersSent,
          escalationsSent,
        };
      },
    },
    {
      name: "usage-cycle-rollover",
      intervalMs: getIntervalMs(
        "SCHEDULER_USAGE_INTERVAL_MS",
        6 * 60 * 60 * 1000,
      ),
      run: async () => {
        const now = new Date();
        const nextCycleEnd = new Date(now);
        nextCycleEnd.setUTCDate(nextCycleEnd.getUTCDate() + 30);

        const updated = await db
          .update(organizationSubscriptions)
          .set({
            aiCreditsUsed: 0,
            cycleStartAt: now,
            cycleEndAt: nextCycleEnd,
            updatedAt: now,
          })
          .where(
            and(
              lte(organizationSubscriptions.cycleEndAt, now),
              inArray(organizationSubscriptions.status, ["active", "grace"]),
            ),
          )
          .returning({ id: organizationSubscriptions.id });

        return { rolledOverSubscriptions: updated.length };
      },
    },
    {
      name: "smartmail-auto-sync",
      intervalMs: getIntervalMs(
        "SCHEDULER_SMARTMAIL_INTERVAL_MS",
        15 * 60 * 1000,
      ),
      run: async () => {
        const key = getEncryptionKey();
        if (!key) {
          return {
            checkedAccounts: 0,
            syncedAccounts: 0,
            failedAccounts: 0,
            skippedAccounts: 0,
            reason: "ENCRYPTION_KEY missing",
          };
        }

        const now = new Date();
        const maxResults = getPositiveInt(
          "SMARTMAIL_DEFAULT_SYNC_MAX_RESULTS",
          25,
        );
        const lookbackMinutes = getPositiveInt(
          "SMARTMAIL_SYNC_LOOKBACK_MINUTES",
          30,
        );

        const accounts = await db
          .select()
          .from(smartMailAccounts)
          .where(
            and(
              eq(smartMailAccounts.status, "connected"),
              eq(smartMailAccounts.autoSyncEnabled, true),
              isNull(smartMailAccounts.revokedAt),
            ),
          );

        let syncedAccounts = 0;
        let failedAccounts = 0;
        let skippedAccounts = 0;
        let fetchedMessages = 0;
        let upsertedMessages = 0;

        for (const account of accounts) {
          if (!account.defaultProjectId || !account.accessToken) {
            skippedAccounts += 1;
            continue;
          }

          if (account.provider !== "gmail" && account.provider !== "outlook") {
            skippedAccounts += 1;
            continue;
          }

          try {
            let accessToken = decryptOpaqueToken(account.accessToken, key);

            if (
              account.tokenExpiresAt &&
              account.tokenExpiresAt.getTime() <= now.getTime() + 90_000 &&
              account.refreshToken
            ) {
              const refreshed = await refreshProviderAccessToken(
                account.provider,
                decryptOpaqueToken(account.refreshToken, key),
                {
                  googleClientId: process.env.GOOGLE_CLIENT_ID,
                  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
                  outlookClientId: process.env.OUTLOOK_CLIENT_ID,
                  outlookClientSecret: process.env.OUTLOOK_CLIENT_SECRET,
                  redirectUri:
                    process.env.OAUTH_REDIRECT_URI ||
                    "http://localhost:3001/auth/oauth/callback",
                },
              );

              accessToken = refreshed.accessToken;

              await db
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
                .where(eq(smartMailAccounts.id, account.id));
            }

            const since = account.lastSyncAt
              ? new Date(
                  account.lastSyncAt.getTime() - lookbackMinutes * 60_000,
                )
              : undefined;

            const rows = await fetchProviderMessages({
              provider: account.provider,
              accessToken,
              accountEmail: account.email,
              maxResults,
              since,
            });

            let latestCursor: Date | null = null;

            for (const row of rows) {
              const [thread] = await db
                .insert(smartMailThreads)
                .values({
                  organizationId: account.organizationId,
                  projectId: account.defaultProjectId,
                  accountId: account.id,
                  subject: row.subject,
                  externalThreadId: row.externalThreadId,
                  participants: Array.from(
                    new Set(
                      [row.fromEmail, ...row.toEmails, ...row.ccEmails].filter(
                        Boolean,
                      ),
                    ),
                  ),
                  lastMessageAt: row.sentAt,
                })
                .onConflictDoUpdate({
                  target: [
                    smartMailThreads.organizationId,
                    smartMailThreads.accountId,
                    smartMailThreads.externalThreadId,
                  ],
                  set: {
                    projectId: account.defaultProjectId,
                    subject: row.subject,
                    participants: Array.from(
                      new Set(
                        [
                          row.fromEmail,
                          ...row.toEmails,
                          ...row.ccEmails,
                        ].filter(Boolean),
                      ),
                    ),
                    lastMessageAt: row.sentAt,
                    updatedAt: new Date(),
                  },
                })
                .returning();

              await db
                .insert(smartMailMessages)
                .values({
                  threadId: thread.id,
                  organizationId: account.organizationId,
                  projectId: account.defaultProjectId,
                  externalMessageId: row.externalMessageId,
                  direction: row.direction,
                  status: row.direction === "outbound" ? "sent" : "received",
                  fromEmail: row.fromEmail,
                  toEmail: row.toEmails[0] ?? account.email,
                  ccEmails: row.ccEmails,
                  subject: row.subject,
                  body: row.body,
                  providerMetadata: row.providerMetadata,
                  externalCreatedAt: row.sentAt,
                  sentAt: row.sentAt,
                })
                .onConflictDoUpdate({
                  target: [
                    smartMailMessages.organizationId,
                    smartMailMessages.externalMessageId,
                  ],
                  set: {
                    threadId: thread.id,
                    projectId: account.defaultProjectId,
                    direction: row.direction,
                    status: row.direction === "outbound" ? "sent" : "received",
                    fromEmail: row.fromEmail,
                    toEmail: row.toEmails[0] ?? account.email,
                    ccEmails: row.ccEmails,
                    subject: row.subject,
                    body: row.body,
                    providerMetadata: row.providerMetadata,
                    externalCreatedAt: row.sentAt,
                    sentAt: row.sentAt,
                    updatedAt: new Date(),
                  },
                });

              upsertedMessages += 1;
              if (
                !latestCursor ||
                row.sentAt.getTime() > latestCursor.getTime()
              ) {
                latestCursor = row.sentAt;
              }
            }

            fetchedMessages += rows.length;
            syncedAccounts += 1;

            await db
              .update(smartMailAccounts)
              .set({
                status: "connected",
                lastSyncAt: new Date(),
                syncCursor: latestCursor
                  ? latestCursor.toISOString()
                  : account.syncCursor,
                lastSyncStatus: "ok",
                lastSyncError: null,
                updatedAt: new Date(),
              })
              .where(eq(smartMailAccounts.id, account.id));
          } catch (error) {
            failedAccounts += 1;

            await db
              .update(smartMailAccounts)
              .set({
                status: "error",
                lastSyncStatus: "failed",
                lastSyncError:
                  error instanceof Error ? error.message : "Unknown sync error",
                updatedAt: new Date(),
              })
              .where(eq(smartMailAccounts.id, account.id));
          }
        }

        return {
          checkedAccounts: accounts.length,
          syncedAccounts,
          failedAccounts,
          skippedAccounts,
          fetchedMessages,
          upsertedMessages,
        };
      },
    },
    {
      name: "change-order-sla-check",
      intervalMs: getIntervalMs(
        "SCHEDULER_CHANGE_ORDER_INTERVAL_MS",
        30 * 60 * 1000,
      ),
      run: async () => {
        const now = new Date();
        const overdue = await db
          .select({
            id: changeOrders.id,
            organizationId: changeOrders.organizationId,
            createdByUserId: changeOrders.createdByUserId,
            title: changeOrders.title,
          })
          .from(changeOrders)
          .where(
            and(
              lte(changeOrders.deadlineAt, now),
              inArray(changeOrders.status, ["submitted", "under_review"]),
              sql`${changeOrders.pipelineStage} <> 'escalated'`,
            ),
          );

        if (overdue.length === 0) {
          return {
            overdueCandidates: 0,
            escalatedChangeOrders: 0,
            notificationsCreated: 0,
          };
        }

        const overdueIds = overdue.map((row) => row.id);
        const escalated = await db
          .update(changeOrders)
          .set({
            pipelineStage: "escalated",
            updatedAt: now,
          })
          .where(inArray(changeOrders.id, overdueIds))
          .returning({
            id: changeOrders.id,
            organizationId: changeOrders.organizationId,
            createdByUserId: changeOrders.createdByUserId,
            title: changeOrders.title,
          });

        if (escalated.length > 0) {
          await db.insert(notifications).values(
            escalated.map((row) => ({
              organizationId: row.organizationId,
              userId: row.createdByUserId,
              type: "change_order.sla_breached",
              title: "Change Order Escalated",
              body: `Change order "${row.title}" missed its SLA and has been escalated for review.`,
              metadata: {
                changeOrderId: row.id,
                escalatedAt: now.toISOString(),
              },
            })),
          );
        }

        return {
          overdueCandidates: overdue.length,
          escalatedChangeOrders: escalated.length,
          notificationsCreated: escalated.length,
        };
      },
    },
  ];

  const timers = tasks.map((task) => {
    const runTask = async () => {
      const startedAt = Date.now();
      try {
        const result = await task.run();
        logger.info(
          {
            task: task.name,
            durationMs: Date.now() - startedAt,
            result,
          },
          "scheduler task completed",
        );
      } catch (error) {
        logger.error(
          {
            task: task.name,
            durationMs: Date.now() - startedAt,
            err: error,
          },
          "scheduler task failed",
        );
      }
    };

    void runTask();
    return setInterval(() => {
      void runTask();
    }, task.intervalMs);
  });

  logger.info(
    {
      tasks: tasks.map((task) => ({
        name: task.name,
        intervalMs: task.intervalMs,
      })),
    },
    "scheduler started",
  );

  return () => {
    for (const timer of timers) {
      clearInterval(timer);
    }
    logger.info("scheduler stopped");
  };
}
