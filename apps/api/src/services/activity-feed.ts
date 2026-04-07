import { and, count, desc, eq, gt, gte, inArray, isNull, lte } from "drizzle-orm";
import { auditLogs, projects, billingRecords, budgetCostCodes, changeOrders } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest } from "../lib/errors";
import { getAuthContext } from "../middleware/require-auth";
import type { ValidatedRequest } from "../lib/validate";
import {
  activityFeedEntityTimelineQuerySchema,
  listActivityFeedQuerySchema,
} from "../schemas/activity-feed.schema";

function requireOrg(request: Request) {
  const { session } = getAuthContext(request);
  if (!session.activeOrganizationId) {
    throw badRequest("An active organization is required");
  }
  return session.activeOrganizationId;
}

function readValidatedQuery<T>(request: Request) {
  return (request as ValidatedRequest).validated?.query as T;
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

type HealthFactorStatus = "ok" | "warning" | "critical";

export interface ActivityHealthFactor {
  key: string;
  label: string;
  value: number;
  impact: number;
  status: HealthFactorStatus;
}

export interface ActivityHealthAssessment {
  score: number;
  status: "healthy" | "warning" | "critical";
  factors: ActivityHealthFactor[];
  recommendations: string[];
}

function toFactorStatus(deduction: number): HealthFactorStatus {
  if (deduction <= 0) {
    return "ok";
  }
  if (deduction < 10) {
    return "warning";
  }
  return "critical";
}

function extractProjectId(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const projectId = (value as Record<string, unknown>).projectId;
  return typeof projectId === "string" && projectId.length > 0 ? projectId : null;
}

function resolveProjectIdFromLog(log: {
  metadata: unknown;
  beforeData: unknown;
  afterData: unknown;
}) {
  return extractProjectId(log.metadata) ?? extractProjectId(log.afterData) ?? extractProjectId(log.beforeData);
}

function toActivityItem(log: any) {
  return {
    id: log.id,
    type: log.action,
    entity: log.entityType,
    entityId: log.entityId,
    actor: log.actorUserId,
    projectId: resolveProjectIdFromLog(log),
    timestamp: log.createdAt,
    changes: log.beforeData ? { before: log.beforeData, after: log.afterData } : null,
    description: `${log.action} ${log.entityType}: ${log.entityId}`,
  };
}

export function buildActivityHealthAssessment(metrics: {
  pendingChangeOrders: number;
  overBudgetItems: number;
  unpaidInvoices: number;
}): ActivityHealthAssessment {
  const changeOrderDeduction = Math.min(20, metrics.pendingChangeOrders * 2);
  const overBudgetDeduction = Math.min(15, metrics.overBudgetItems * 1.5);
  const unpaidInvoiceDeduction = Math.min(25, metrics.unpaidInvoices * 5);

  const factors: ActivityHealthFactor[] = [
    {
      key: "pending_change_orders",
      label: "Pending change orders",
      value: metrics.pendingChangeOrders,
      impact: -changeOrderDeduction,
      status: toFactorStatus(changeOrderDeduction),
    },
    {
      key: "over_budget_items",
      label: "Over-budget cost codes",
      value: metrics.overBudgetItems,
      impact: -overBudgetDeduction,
      status: toFactorStatus(overBudgetDeduction),
    },
    {
      key: "unpaid_invoices",
      label: "Unpaid invoices",
      value: metrics.unpaidInvoices,
      impact: -unpaidInvoiceDeduction,
      status: toFactorStatus(unpaidInvoiceDeduction),
    },
  ];

  const totalDeduction = factors.reduce((sum, factor) => sum + Math.abs(factor.impact), 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - totalDeduction)));
  const status = score >= 80 ? "healthy" : score >= 60 ? "warning" : "critical";

  return {
    score,
    status,
    factors,
    recommendations: getRecommendations(score, metrics),
  };
}

function getRecommendations(
  score: number,
  metrics: {
    pendingChangeOrders: number;
    overBudgetItems: number;
    unpaidInvoices: number;
  },
): string[] {
  const recommendations: string[] = [];

  if (metrics.pendingChangeOrders > 0) {
    recommendations.push(`Review ${metrics.pendingChangeOrders} pending change orders`);
  }

  if (metrics.overBudgetItems > 0) {
    recommendations.push(`Address ${metrics.overBudgetItems} over-budget cost codes`);
  }

  if (metrics.unpaidInvoices > 0) {
    recommendations.push(`Collect payment for ${metrics.unpaidInvoices} unpaid invoices`);
  }

  if (score < 50) {
    recommendations.push("Consider conducting a project audit");
  }

  return recommendations.slice(0, 3);
}

export const activityFeedService = {
  /**
   * Get organization activity feed
   */
  async getActivityFeed(request: Request) {
    const orgId = requireOrg(request);
    const query = listActivityFeedQuerySchema.parse(readValidatedQuery(request));
    const offset = (query.page - 1) * query.pageSize;
    const fromDate = query.from ? new Date(query.from) : null;
    const toDate = query.to ? new Date(query.to) : null;

    const whereConditions = [eq(auditLogs.organizationId, orgId)];
    if (query.entityType) {
      whereConditions.push(eq(auditLogs.entityType, query.entityType));
    }
    if (query.action) {
      whereConditions.push(eq(auditLogs.action, query.action));
    }
    if (query.actorUserId) {
      whereConditions.push(eq(auditLogs.actorUserId, query.actorUserId));
    }
    if (fromDate) {
      whereConditions.push(gte(auditLogs.createdAt, fromDate));
    }
    if (toDate) {
      whereConditions.push(lte(auditLogs.createdAt, toDate));
    }

    const whereClause = and(...whereConditions);

    const activitiesBase = query.projectId
      ? await db.select().from(auditLogs).where(whereClause).orderBy(desc(auditLogs.createdAt))
      : await db
          .select()
          .from(auditLogs)
          .where(whereClause)
          .orderBy(desc(auditLogs.createdAt))
          .limit(query.pageSize)
          .offset(offset);

    const activitiesFiltered = query.projectId
      ? activitiesBase.filter((log: any) => resolveProjectIdFromLog(log) === query.projectId)
      : activitiesBase;

    const pagedActivities = query.projectId
      ? activitiesFiltered.slice(offset, offset + query.pageSize)
      : activitiesFiltered;

    const total = query.projectId
      ? activitiesFiltered.length
      : toNumber(
          (
            await db
              .select({ total: count() })
              .from(auditLogs)
              .where(whereClause)
          )[0]?.total,
        );

    return {
      items: pagedActivities.map((log: any) => toActivityItem(log)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0,
      },
      filters: {
        entityType: query.entityType ?? null,
        action: query.action ?? null,
        actorUserId: query.actorUserId ?? null,
        projectId: query.projectId ?? null,
        from: query.from ?? null,
        to: query.to ?? null,
      },
    };
  },

  async getEntityTimeline(request: Request, entityType: string, entityId: string) {
    const orgId = requireOrg(request);
    const query = activityFeedEntityTimelineQuerySchema.parse(readValidatedQuery(request));
    const offset = (query.page - 1) * query.pageSize;
    const fromDate = query.from ? new Date(query.from) : null;
    const toDate = query.to ? new Date(query.to) : null;

    const whereConditions = [
      eq(auditLogs.organizationId, orgId),
      eq(auditLogs.entityType, entityType),
      eq(auditLogs.entityId, entityId),
    ];

    if (query.action) {
      whereConditions.push(eq(auditLogs.action, query.action));
    }
    if (fromDate) {
      whereConditions.push(gte(auditLogs.createdAt, fromDate));
    }
    if (toDate) {
      whereConditions.push(lte(auditLogs.createdAt, toDate));
    }

    const whereClause = and(...whereConditions);

    const [items, totalResult] = await Promise.all([
      db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(query.pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(auditLogs)
        .where(whereClause),
    ]);

    const total = toNumber(totalResult?.[0]?.total);

    return {
      entity: {
        entityType,
        entityId,
      },
      items: items.map((log: any) => toActivityItem(log)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0,
      },
      filters: {
        action: query.action ?? null,
        from: query.from ?? null,
        to: query.to ?? null,
      },
    };
  },

  /**
   * Get health score for an organization
   */
  async getHealthScore(request: Request) {
    const orgId = requireOrg(request);

    // Collect health metrics
    const [projectCountResult] = await db
      .select({ count: count() })
      .from(projects)
      .where(and(eq(projects.organizationId, orgId), isNull(projects.deletedAt)));

    const [pendingChangeOrdersResult] = await db
      .select({ count: count() })
      .from(changeOrders)
      .where(
        and(
          eq(changeOrders.organizationId, orgId),
          inArray(changeOrders.status, ["submitted", "under_review", "revision_requested"]),
        ),
      );

    const [overBudgetItemsResult] = await db
      .select({ count: count() })
      .from(budgetCostCodes)
      .where(and(eq(budgetCostCodes.organizationId, orgId), gt(budgetCostCodes.actualCents, budgetCostCodes.budgetCents)));

    const [unpaidInvoicesResult] = await db
      .select({ count: count() })
      .from(billingRecords)
      .where(
        and(
          eq(billingRecords.organizationId, orgId),
          eq(billingRecords.status, "issued"),
          isNull(billingRecords.deletedAt),
        ),
      );

    const projectCount = toNumber(projectCountResult?.count);
    const pendingChangeOrders = toNumber(pendingChangeOrdersResult?.count);
    const overBudgetItems = toNumber(overBudgetItemsResult?.count);
    const unpaidInvoices = toNumber(unpaidInvoicesResult?.count);

    const healthAssessment = buildActivityHealthAssessment({
      pendingChangeOrders,
      overBudgetItems,
      unpaidInvoices,
    });

    return {
      score: healthAssessment.score,
      status: healthAssessment.status,
      metrics: {
        projects: projectCount,
        pendingChangeOrders,
        overBudgetItems,
        unpaidInvoices,
      },
      factors: healthAssessment.factors,
      recommendations: healthAssessment.recommendations,
      generatedAt: new Date().toISOString(),
    };
  },

  /**
   * Get project health for a specific project
   */
  async getProjectHealth(request: Request, projectId: string) {
    const orgId = requireOrg(request);

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, orgId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      throw badRequest("Project not found");
    }

    // Get project-specific metrics
    const [costCodeStatsResult] = await db
      .select({ count: count() })
      .from(budgetCostCodes)
      .where(and(eq(budgetCostCodes.organizationId, orgId), eq(budgetCostCodes.projectId, projectId)));

    const [changeOrderStatsResult] = await db
      .select({ count: count() })
      .from(changeOrders)
      .where(
        and(
          eq(changeOrders.organizationId, orgId),
          eq(changeOrders.projectId, projectId),
        ),
      );

    const totalCostCodes = toNumber(costCodeStatsResult?.count);
    const totalChangeOrders = toNumber(changeOrderStatsResult?.count);

    let projectScore = 100;

    // Deduct for change orders
    projectScore -= Math.min(20, totalChangeOrders * 3);

    projectScore = Math.max(0, Math.min(100, projectScore));

    return {
      projectId,
      projectName: project.name,
      score: Math.round(projectScore),
      status: projectScore >= 80 ? "healthy" : projectScore >= 60 ? "warning" : "critical",
      metrics: {
        totalCostCodes,
        totalChangeOrders,
      },
    };
  },
};
