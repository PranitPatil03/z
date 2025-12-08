import { eq, desc, limit } from "drizzle-orm";
import { auditLogs, projects, billingRecords, budgetCostCodes, changeOrders } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";

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
    const [projectCount] = await db
      .select({ count: projects.id })
      .from(projects)
      .where(eq(projects.organizationId, orgId));

    const [pendingChangeOrders] = await db
      .select({ count: changeOrders.id })
      .from(changeOrders)
      .where(eq(changeOrders.status, "submitted") as any);

    const [overBudgetItems] = await db
      .select({ count: budgetCostCodes.id })
      .from(budgetCostCodes)
      .where(eq(budgetCostCodes.organizationId, orgId));

    const [unpaidInvoices] = await db
      .select({ count: billingRecords.id })
      .from(billingRecords)
      .where(eq(billingRecords.status, "unpaid"));

    // Calculate health score (0-100)
    let score = 100;

    // Deduct for pending change orders (max 20 points)
    score -= Math.min(20, (pendingChangeOrders?.count || 0) * 2);

    // Deduct for over-budget items (max 15 points)
    score -= Math.min(15, (overBudgetItems?.count || 0) * 1.5);

    // Deduct for unpaid invoices (max 25 points)
    score -= Math.min(25, (unpaidInvoices?.count || 0) * 5);

    score = Math.max(0, Math.min(100, score));

    return {
      score: Math.round(score),
      status: score >= 80 ? "healthy" : score >= 60 ? "warning" : "critical",
      metrics: {
        projects: projectCount?.count || 0,
        pendingChangeOrders: pendingChangeOrders?.count || 0,
        overBudgetItems: overBudgetItems?.count || 0,
        unpaidInvoices: unpaidInvoices?.count || 0,
      },
      recommendations: getRecommendations(score, {
        pendingChangeOrders: pendingChangeOrders?.count || 0,
        overBudgetItems: overBudgetItems?.count || 0,
        unpaidInvoices: unpaidInvoices?.count || 0,
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
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      throw badRequest("Project not found");
    }

    // Get project-specific metrics
    const [costCodeStats] = await db
      .select({ count: budgetCostCodes.id })
      .from(budgetCostCodes)
      .where(eq(budgetCostCodes.projectId, projectId));

    const [changeOrderStats] = await db
      .select({ count: changeOrders.id })
      .from(changeOrders)
      .where(eq(changeOrders.projectId, projectId));

    let projectScore = 100;

    // Deduct for change orders
    projectScore -= Math.min(20, (changeOrderStats?.count || 0) * 3);

    projectScore = Math.max(0, Math.min(100, projectScore));

    return {
      projectId,
      projectName: project.name,
      score: Math.round(projectScore),
      status: projectScore >= 80 ? "healthy" : projectScore >= 60 ? "warning" : "critical",
      metrics: {
        totalCostCodes: costCodeStats?.count || 0,
        totalChangeOrders: changeOrderStats?.count || 0,
      },
    };
  },
};
