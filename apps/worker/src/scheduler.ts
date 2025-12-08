import { createDb, changeOrders, complianceItems, notifications, organizationSubscriptions, subcontractors } from "@foreman/db";
import { and, eq, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import type pino from "pino";
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
      intervalMs: getIntervalMs("SCHEDULER_COMPLIANCE_INTERVAL_MS", 60 * 60 * 1000),
      run: async () => {
        const now = new Date();
        const expiringWindowDays = Number(process.env.SCHEDULER_COMPLIANCE_EXPIRING_DAYS ?? "14");
        const reminderIntervalHours = Number(process.env.SCHEDULER_COMPLIANCE_REMINDER_INTERVAL_HOURS ?? "24");
        const escalationIntervalHours = Number(process.env.SCHEDULER_COMPLIANCE_ESCALATION_INTERVAL_HOURS ?? "24");
        const expiringCutoff = new Date(now.getTime() + expiringWindowDays * 24 * 60 * 60 * 1000);

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

        const subcontractorIds = Array.from(new Set(candidates.map((row) => row.subcontractorId).filter((id): id is string => Boolean(id))));
        const subcontractorRows = subcontractorIds.length
          ? await db
              .select({
                id: subcontractors.id,
                email: subcontractors.email,
                name: subcontractors.name,
              })
              .from(subcontractors)
              .where(and(inArray(subcontractors.id, subcontractorIds), isNull(subcontractors.deletedAt)))
          : [];
        const subcontractorById = new Map(subcontractorRows.map((row) => [row.id, row]));

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
              !item.escalationSentAt || now.getTime() - item.escalationSentAt.getTime() >= escalationIntervalMs;

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
                  subject: "Foreman Compliance Escalation",
                  body:
                    `Compliance requirement ${item.complianceType} is overdue for your project scope. ` +
                    `Please upload evidence immediately to avoid payment delays.`,
                });
                escalationsSent += 1;
              }
            }

            continue;
          }

          const shouldRemind = !item.reminderSentAt || now.getTime() - item.reminderSentAt.getTime() >= reminderIntervalMs;
          const nextStatus = item.status === "pending" ? "expiring" : item.status;

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
                subject: "Foreman Compliance Reminder",
                body:
                  `Compliance requirement ${item.complianceType} is approaching its due date. ` +
                  `Upload your documentation in the SubConnect portal to stay compliant.`,
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
      intervalMs: getIntervalMs("SCHEDULER_USAGE_INTERVAL_MS", 6 * 60 * 60 * 1000),
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
      name: "change-order-sla-check",
      intervalMs: getIntervalMs("SCHEDULER_CHANGE_ORDER_INTERVAL_MS", 30 * 60 * 1000),
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
      tasks: tasks.map((task) => ({ name: task.name, intervalMs: task.intervalMs })),
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
