import { and, count, desc, eq, isNull } from "drizzle-orm";
import { auditLogs, projects, billingRecords, budgetCostCodes, changeOrders } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest } from "../lib/errors";
import { getAuthContext } from "../middleware/require-auth";

function requireOrg(request: Request) {
  const { session } = getAuthContext(request);
  if (!session.activeOrganizationId) {
    throw badRequest("An active organization is required");
  }
  return session.activeOrganizationId;
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
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
  async getActivityFeed(request: Request, pageSize: number = 50) {
    const orgId = requireOrg(request);

    const activities = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, orgId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(pageSize);

    return activities.map((log: any) => ({
      id: log.id,
      type: log.action,
      entity: log.entityType,
      entityId: log.entityId,
      actor: log.actorUserId,
      timestamp: log.createdAt,
      changes: log.beforeData ? { before: log.beforeData, after: log.afterData } : null,
      description: `${log.action} ${log.entityType}: ${log.entityId}`,
    }));
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
          eq(changeOrders.status, "submitted"),
        ),
      );

    const [overBudgetItemsResult] = await db
      .select({ count: count() })
      .from(budgetCostCodes)
      .where(eq(budgetCostCodes.organizationId, orgId));

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

    // Calculate health score (0-100)
    let score = 100;

    // Deduct for pending change orders (max 20 points)
    score -= Math.min(20, pendingChangeOrders * 2);

    // Deduct for over-budget items (max 15 points)
    score -= Math.min(15, overBudgetItems * 1.5);

    // Deduct for unpaid invoices (max 25 points)
    score -= Math.min(25, unpaidInvoices * 5);

    score = Math.max(0, Math.min(100, score));

    return {
      score: Math.round(score),
      status: score >= 80 ? "healthy" : score >= 60 ? "warning" : "critical",
      metrics: {
        projects: projectCount,
        pendingChangeOrders,
        overBudgetItems,
        unpaidInvoices,
      },
      recommendations: getRecommendations(score, {
        pendingChangeOrders,
        overBudgetItems,
        unpaidInvoices,
      }),
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
