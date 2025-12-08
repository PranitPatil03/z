import { and, eq } from "drizzle-orm";
import { budgetAlerts, budgetCostCodes } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  budgetCostCodeIdParamsSchema,
  createBudgetCostCodeSchema,
  listBudgetQuerySchema,
  updateBudgetCostCodeSchema,
} from "../schemas/budget.schema";

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
  const { session } = getAuthContext(request);
  if (!session.activeOrganizationId) {
    throw badRequest("An active organization is required");
  }
  return { orgId: session.activeOrganizationId };
}

function varianceBps(item: { budgetCents: number; actualCents: number }) {
  if (item.budgetCents <= 0) {
    return 0;
  }
  return Math.round(((item.actualCents - item.budgetCents) * 10000) / item.budgetCents);
}

function severityFromVariance(bps: number) {
  if (bps >= 2000) {
    return "critical";
  }
  if (bps >= 1000) {
    return "high";
  }
  if (bps >= 500) {
    return "medium";
  }
  return "low";
}

export const budgetService = {
  async listCostCodes(request: Request) {
    const { orgId } = requireContext(request);
    const query = listBudgetQuerySchema.parse(readValidatedQuery(request));

    return await db
      .select()
      .from(budgetCostCodes)
      .where(and(eq(budgetCostCodes.organizationId, orgId), eq(budgetCostCodes.projectId, query.projectId)));
  },

  async createCostCode(request: Request) {
    const { orgId } = requireContext(request);
    const body = createBudgetCostCodeSchema.parse(readValidatedBody(request));

    const [record] = await db
      .insert(budgetCostCodes)
      .values({
        organizationId: orgId,
        projectId: body.projectId,
        code: body.code,
        name: body.name,
        budgetCents: body.budgetCents,
        alertThresholdBps: body.alertThresholdBps,
      })
      .returning();

    return record;
  },

  async updateCostCode(request: Request) {
    const { orgId } = requireContext(request);
    const params = budgetCostCodeIdParamsSchema.parse(readValidatedParams(request));
    const body = updateBudgetCostCodeSchema.parse(readValidatedBody(request));

    const [record] = await db
      .update(budgetCostCodes)
      .set({
        name: body.name,
        budgetCents: body.budgetCents,
        committedCents: body.committedCents,
        actualCents: body.actualCents,
        billedCents: body.billedCents,
        alertThresholdBps: body.alertThresholdBps,
        updatedAt: new Date(),
      })
      .where(and(eq(budgetCostCodes.id, params.costCodeId), eq(budgetCostCodes.organizationId, orgId)))
      .returning();

    if (!record) {
      throw notFound("Budget cost code not found");
    }

    const bps = varianceBps(record);
    if (bps >= record.alertThresholdBps) {
      await db.insert(budgetAlerts).values({
        organizationId: orgId,
        projectId: record.projectId,
        costCodeId: record.id,
        severity: severityFromVariance(bps),
        narrative: `Cost code ${record.code} is over budget by ${Math.round(bps / 100)}%`,
      });
    }

    return record;
  },

  async variance(request: Request) {
    const { orgId } = requireContext(request);
    const query = listBudgetQuerySchema.parse(readValidatedQuery(request));

    const codes = await db
      .select()
      .from(budgetCostCodes)
      .where(and(eq(budgetCostCodes.organizationId, orgId), eq(budgetCostCodes.projectId, query.projectId)));

    const totals = codes.reduce(
      (acc, code) => {
        acc.budgetCents += code.budgetCents;
        acc.actualCents += code.actualCents;
        acc.committedCents += code.committedCents;
        acc.billedCents += code.billedCents;
        return acc;
      },
      { budgetCents: 0, actualCents: 0, committedCents: 0, billedCents: 0 },
    );

    return {
      totals,
      varianceBps: varianceBps({ budgetCents: totals.budgetCents, actualCents: totals.actualCents }),
      byCostCode: codes.map((code) => ({
        ...code,
        varianceBps: varianceBps(code),
      })),
    };
  },

  async reconciliation(request: Request) {
    const { orgId } = requireContext(request);
    const query = listBudgetQuerySchema.parse(readValidatedQuery(request));

    const [codes, alerts] = await Promise.all([
      db
        .select()
        .from(budgetCostCodes)
        .where(and(eq(budgetCostCodes.organizationId, orgId), eq(budgetCostCodes.projectId, query.projectId))),
      db
        .select()
        .from(budgetAlerts)
        .where(and(eq(budgetAlerts.organizationId, orgId), eq(budgetAlerts.projectId, query.projectId))),
    ]);

    return {
      items: codes.map((code) => ({
        id: code.id,
        code: code.code,
        name: code.name,
        budgetCents: code.budgetCents,
        committedCents: code.committedCents,
        actualCents: code.actualCents,
        billedCents: code.billedCents,
        varianceBps: varianceBps(code),
      })),
      alerts,
    };
  },
};
