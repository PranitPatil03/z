import {
  budgetAlerts,
  budgetCostCodes,
  changeOrders,
  complianceItems,
  invoices,
  matchRuns,
  payApplications,
  projects,
  siteSnaps,
  smartMailThreads,
} from "@foreman/db";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import type { Request } from "express";
import { db } from "../database";
import { badRequest } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  commandCenterHealthQuerySchema,
  commandCenterOverviewQuerySchema,
  commandCenterPortfolioQuerySchema,
} from "../schemas/command-center.schema";
import {
  buildHealthScore,
  computeAverageAgeDays,
  computeBudgetBurnBps,
  computeRateBps,
  type CommandCenterHealthInputs,
} from "./command-center-metrics";

function readValidatedQuery<T>(request: Request) {
  return (request as ValidatedRequest).validated?.query as T;
}

function requireOrg(request: Request) {
  const { session } = getAuthContext(request);
  if (!session.activeOrganizationId) {
    throw badRequest("An active organization is required");
  }
  return session.activeOrganizationId;
}

const OPEN_CHANGE_ORDER_STATUSES = new Set(["submitted", "under_review", "revision_requested"]);
const COMPLIANCE_OK_STATUSES = new Set(["verified", "compliant"]);
const COMPLIANCE_RISK_STATUSES = new Set(["expired", "non_compliant"]);
const PENDING_PAY_APPLICATION_STATUSES = new Set(["submitted", "under_review"]);

function countByStatus<T extends { status: string }>(rows: T[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});
}

function toPercent(valueBps: number) {
  return Number((valueBps / 100).toFixed(2));
}

interface ProjectMetrics {
  projectId: string;
  windowDays: number;
  summary: {
    changeOrders: number;
    openChangeOrders: number;
    changeOrderVelocityBps: number;
    budgetAlerts: number;
    highRiskBudgetAlerts: number;
    budgetTotalCents: number;
    actualCostCents: number;
    budgetBurnBps: number;
    siteSnaps: number;
    reviewedSiteSnaps: number;
    reviewedSiteSnapRateBps: number;
    smartMailThreads: number;
    recentSmartMailThreads: number;
    invoices: number;
    matchRuns: number;
    completedMatchRuns: number;
    matchSuccessRateBps: number;
    overdueComplianceItems: number;
    nonCompliantComplianceItems: number;
    pendingPayApplications: number;
    pendingPayApplicationAverageAgeDays: number;
  };
  breakdown: {
    changeOrderByStatus: Record<string, number>;
    complianceByStatus: Record<string, number>;
  };
  healthInputs: CommandCenterHealthInputs;
}

async function collectProjectMetrics(orgId: string, projectId: string, windowDays: number): Promise<ProjectMetrics> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const [
    projectChangeOrders,
    projectBudgetAlerts,
    projectSiteSnaps,
    projectThreads,
    projectInvoices,
    projectMatchRuns,
    projectBudgetCostCodes,
    projectComplianceItems,
    projectPayApplications,
  ] = await Promise.all([
    db
      .select()
      .from(changeOrders)
      .where(and(eq(changeOrders.organizationId, orgId), eq(changeOrders.projectId, projectId))),
    db
      .select()
      .from(budgetAlerts)
      .where(and(eq(budgetAlerts.organizationId, orgId), eq(budgetAlerts.projectId, projectId))),
    db
      .select()
      .from(siteSnaps)
      .where(and(eq(siteSnaps.organizationId, orgId), eq(siteSnaps.projectId, projectId))),
    db
      .select()
      .from(smartMailThreads)
      .where(and(eq(smartMailThreads.organizationId, orgId), eq(smartMailThreads.projectId, projectId))),
    db
      .select()
      .from(invoices)
      .where(and(eq(invoices.organizationId, orgId), eq(invoices.projectId, projectId))),
    db
      .select()
      .from(matchRuns)
      .where(and(eq(matchRuns.organizationId, orgId), eq(matchRuns.projectId, projectId))),
    db
      .select()
      .from(budgetCostCodes)
      .where(and(eq(budgetCostCodes.organizationId, orgId), eq(budgetCostCodes.projectId, projectId))),
    db
      .select()
      .from(complianceItems)
      .where(
        and(
          eq(complianceItems.organizationId, orgId),
          eq(complianceItems.projectId, projectId),
          isNull(complianceItems.deletedAt),
        ),
      ),
    db
      .select()
      .from(payApplications)
      .where(
        and(
          eq(payApplications.organizationId, orgId),
          eq(payApplications.projectId, projectId),
          isNull(payApplications.deletedAt),
        ),
      ),
  ]);

  const changeOrderByStatus = countByStatus(projectChangeOrders);
  const complianceByStatus = countByStatus(projectComplianceItems);

  const highRiskAlerts = projectBudgetAlerts.filter(
    (row) => (row.severity === "high" || row.severity === "critical") && row.resolvedAt === null,
  ).length;

  const reviewedSnaps = projectSiteSnaps.filter((row) => row.status === "reviewed").length;
  const reviewedSiteSnapRateBps = computeRateBps(reviewedSnaps, projectSiteSnaps.length);

  const totalBudgetCents = projectBudgetCostCodes.reduce((sum, row) => sum + row.budgetCents, 0);
  const totalActualCents = projectBudgetCostCodes.reduce((sum, row) => sum + row.actualCents, 0);
  const budgetBurnBps = computeBudgetBurnBps(totalBudgetCents, totalActualCents);

  const openChangeOrders = projectChangeOrders.filter((row) => OPEN_CHANGE_ORDER_STATUSES.has(row.status)).length;
  const submittedInWindow = projectChangeOrders.filter(
    (row) => row.submittedAt !== null && row.submittedAt >= windowStart,
  ).length;
  const resolvedInWindow = projectChangeOrders.filter(
    (row) => row.resolvedAt !== null && row.resolvedAt >= windowStart,
  ).length;
  const changeOrderVelocityBps = computeRateBps(resolvedInWindow, submittedInWindow);

  const overdueComplianceItems = projectComplianceItems.filter(
    (row) => row.dueDate !== null && row.dueDate < now && !COMPLIANCE_OK_STATUSES.has(row.status),
  ).length;
  const nonCompliantComplianceItems = projectComplianceItems.filter((row) => COMPLIANCE_RISK_STATUSES.has(row.status)).length;

  const pendingPayApplications = projectPayApplications.filter((row) => PENDING_PAY_APPLICATION_STATUSES.has(row.status));
  const pendingPayApplicationAverageAgeDays = computeAverageAgeDays(
    pendingPayApplications.map((row) => row.submittedAt ?? row.createdAt),
    now,
  );

  const completedMatchRuns = projectMatchRuns.filter((row) => row.result === "matched").length;
  const matchSuccessRateBps = computeRateBps(completedMatchRuns, projectMatchRuns.length);

  const recentSmartMailThreads = projectThreads.filter(
    (row) => row.lastMessageAt !== null && row.lastMessageAt >= windowStart,
  ).length;

  return {
    projectId,
    windowDays,
    summary: {
      changeOrders: projectChangeOrders.length,
      openChangeOrders,
      changeOrderVelocityBps,
      budgetAlerts: projectBudgetAlerts.length,
      highRiskBudgetAlerts: highRiskAlerts,
      budgetTotalCents: totalBudgetCents,
      actualCostCents: totalActualCents,
      budgetBurnBps,
      siteSnaps: projectSiteSnaps.length,
      reviewedSiteSnaps: reviewedSnaps,
      reviewedSiteSnapRateBps,
      smartMailThreads: projectThreads.length,
      recentSmartMailThreads,
      invoices: projectInvoices.length,
      matchRuns: projectMatchRuns.length,
      completedMatchRuns,
      matchSuccessRateBps,
      overdueComplianceItems,
      nonCompliantComplianceItems,
      pendingPayApplications: pendingPayApplications.length,
      pendingPayApplicationAverageAgeDays,
    },
    breakdown: {
      changeOrderByStatus,
      complianceByStatus,
    },
    healthInputs: {
      budgetBurnBps,
      highRiskAlertCount: highRiskAlerts,
      openChangeOrderCount: openChangeOrders,
      overdueComplianceCount: overdueComplianceItems,
      pendingPayApplicationCount: pendingPayApplications.length,
      pendingPayApplicationAverageAgeDays,
      reviewedSiteSnapRateBps,
    },
  };
}

export const commandCenterService = {
  async overview(request: Request) {
    const orgId = requireOrg(request);
    const query = commandCenterOverviewQuerySchema.parse(readValidatedQuery(request));

    return await collectProjectMetrics(orgId, query.projectId, query.windowDays);
  },

  async health(request: Request) {
    const orgId = requireOrg(request);
    const query = commandCenterHealthQuerySchema.parse(readValidatedQuery(request));
    const metrics = await collectProjectMetrics(orgId, query.projectId, query.windowDays);
    const health = buildHealthScore(metrics.healthInputs);

    return {
      projectId: query.projectId,
      windowDays: query.windowDays,
      score: health.score,
      scoreBps: health.scoreBps,
      status: health.band,
      factors: health.factors,
      metrics: {
        budgetBurnPercent: toPercent(metrics.summary.budgetBurnBps),
        openChangeOrders: metrics.summary.openChangeOrders,
        highRiskBudgetAlerts: metrics.summary.highRiskBudgetAlerts,
        overdueComplianceItems: metrics.summary.overdueComplianceItems,
        pendingPayApplications: metrics.summary.pendingPayApplications,
        pendingPayApplicationAverageAgeDays: metrics.summary.pendingPayApplicationAverageAgeDays,
        reviewedSiteSnapRatePercent: toPercent(metrics.summary.reviewedSiteSnapRateBps),
        matchSuccessRatePercent: toPercent(metrics.summary.matchSuccessRateBps),
      },
    };
  },

  async portfolio(request: Request) {
    const orgId = requireOrg(request);
    const query = commandCenterPortfolioQuerySchema.parse(readValidatedQuery(request));

    const scopedProjects = await db
      .select({
        id: projects.id,
        code: projects.code,
        name: projects.name,
        status: projects.status,
      })
      .from(projects)
      .where(and(eq(projects.organizationId, orgId), isNull(projects.deletedAt), ne(projects.status, "archived")))
      .orderBy(desc(projects.updatedAt))
      .limit(query.limit);

    const projectCards = await Promise.all(
      scopedProjects.map(async (project) => {
        const metrics = await collectProjectMetrics(orgId, project.id, query.windowDays);
        const health = buildHealthScore(metrics.healthInputs);
        const topRiskFactors = health.factors
          .filter((factor) => factor.impactBps < 0)
          .sort((a, b) => a.impactBps - b.impactBps)
          .slice(0, 2);

        return {
          projectId: project.id,
          projectCode: project.code,
          projectName: project.name,
          projectStatus: project.status,
          health: {
            score: health.score,
            scoreBps: health.scoreBps,
            status: health.band,
          },
          summary: {
            budgetBurnPercent: toPercent(metrics.summary.budgetBurnBps),
            openChangeOrders: metrics.summary.openChangeOrders,
            highRiskBudgetAlerts: metrics.summary.highRiskBudgetAlerts,
            overdueComplianceItems: metrics.summary.overdueComplianceItems,
            pendingPayApplications: metrics.summary.pendingPayApplications,
          },
          topRiskFactors,
        };
      }),
    );

    const totalProjects = projectCards.length;
    const averageHealthScore =
      totalProjects > 0
        ? Math.round(projectCards.reduce((sum, project) => sum + project.health.score, 0) / totalProjects)
        : 0;
    const criticalProjects = projectCards.filter((project) => project.health.status === "critical").length;
    const watchProjects = projectCards.filter((project) => project.health.status === "watch").length;

    const topRisks = [...projectCards]
      .sort((a, b) => a.health.scoreBps - b.health.scoreBps)
      .slice(0, 3)
      .map((project) => ({
        projectId: project.projectId,
        projectCode: project.projectCode,
        projectName: project.projectName,
        score: project.health.score,
        status: project.health.status,
      }));

    return {
      windowDays: query.windowDays,
      projectCount: totalProjects,
      averageHealthScore,
      criticalProjects,
      watchProjects,
      topRisks,
      projects: projectCards,
    };
  },
};
