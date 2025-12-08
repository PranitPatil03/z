import { and, eq } from "drizzle-orm";
import { budgetAlerts, changeOrders, invoices, matchRuns, siteSnaps, smartMailThreads } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import { commandCenterOverviewQuerySchema } from "../schemas/command-center.schema";

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

export const commandCenterService = {
  async overview(request: Request) {
    const orgId = requireOrg(request);
    const query = commandCenterOverviewQuerySchema.parse(readValidatedQuery(request));

    const [projectChangeOrders, projectBudgetAlerts, projectSiteSnaps, projectThreads, projectInvoices, projectMatchRuns] =
      await Promise.all([
        db
          .select()
          .from(changeOrders)
          .where(and(eq(changeOrders.organizationId, orgId), eq(changeOrders.projectId, query.projectId))),
        db
          .select()
          .from(budgetAlerts)
          .where(and(eq(budgetAlerts.organizationId, orgId), eq(budgetAlerts.projectId, query.projectId))),
        db
          .select()
          .from(siteSnaps)
          .where(and(eq(siteSnaps.organizationId, orgId), eq(siteSnaps.projectId, query.projectId))),
        db
          .select()
          .from(smartMailThreads)
          .where(and(eq(smartMailThreads.organizationId, orgId), eq(smartMailThreads.projectId, query.projectId))),
        db
          .select()
          .from(invoices)
          .where(and(eq(invoices.organizationId, orgId), eq(invoices.projectId, query.projectId))),
        db
          .select()
          .from(matchRuns)
          .where(and(eq(matchRuns.organizationId, orgId), eq(matchRuns.projectId, query.projectId))),
      ]);

    const changeOrderByStatus = projectChangeOrders.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    }, {});

    const highRiskAlerts = projectBudgetAlerts.filter((row) => row.severity === "high" || row.severity === "critical").length;
    const reviewedSnaps = projectSiteSnaps.filter((row) => row.status === "reviewed").length;
    const successfulMatches = projectMatchRuns.filter((row) => row.result === "matched").length;

    return {
      projectId: query.projectId,
      summary: {
        changeOrders: projectChangeOrders.length,
        budgetAlerts: projectBudgetAlerts.length,
        highRiskBudgetAlerts: highRiskAlerts,
        siteSnaps: projectSiteSnaps.length,
        reviewedSiteSnaps: reviewedSnaps,
        smartMailThreads: projectThreads.length,
        invoices: projectInvoices.length,
        matchRuns: projectMatchRuns.length,
        completedMatchRuns: successfulMatches,
      },
      breakdown: {
        changeOrderByStatus,
      },
    };
  },
};
