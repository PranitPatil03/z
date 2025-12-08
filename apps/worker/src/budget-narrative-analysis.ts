import { budgetAlerts, budgetCostCodes, createDb } from "@foreman/db";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import type pino from "pino";

interface BudgetNarrativeContext {
  type?: unknown;
  costCodeId?: unknown;
  projectId?: unknown;
  organizationId?: unknown;
  orgId?: unknown;
  varianceBps?: unknown;
}

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function severityFromVarianceBps(varianceBps: number) {
  const variancePercent = Math.max(0, Math.round(varianceBps / 100));
  if (variancePercent >= 20) {
    return "critical";
  }
  if (variancePercent >= 10) {
    return "high";
  }
  if (variancePercent >= 5) {
    return "medium";
  }
  return "low";
}

function calculateVarianceBps(budgetCents: number, actualCents: number) {
  if (budgetCents <= 0) {
    return 0;
  }
  return ((actualCents - budgetCents) * 10000) / budgetCents;
}

function isBudgetNarrativeContext(
  context: BudgetNarrativeContext,
): context is BudgetNarrativeContext & {
  type: "budget_narrative";
  costCodeId: string;
  projectId: string;
} {
  return (
    context.type === "budget_narrative" &&
    typeof context.costCodeId === "string" &&
    context.costCodeId.length > 0 &&
    typeof context.projectId === "string" &&
    context.projectId.length > 0
  );
}

export async function persistBudgetNarrative(params: {
  output: string;
  context: BudgetNarrativeContext;
  logger: pino.Logger;
}) {
  if (!isBudgetNarrativeContext(params.context)) {
    return { handled: false as const, reason: "not_budget_narrative_context" as const };
  }

  const organizationId = readString(params.context.organizationId) ?? readString(params.context.orgId);
  if (!organizationId) {
    return { handled: false as const, reason: "missing_organization" as const };
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    params.logger.warn("Budget narrative persistence skipped: DATABASE_URL not configured");
    return { handled: false as const, reason: "database_unavailable" as const };
  }

  const narrative = params.output.trim();
  if (narrative.length === 0) {
    return { handled: false as const, reason: "empty_output" as const };
  }

  const db = createDb(databaseUrl);

  const [costCode] = await db
    .select()
    .from(budgetCostCodes)
    .where(
      and(
        eq(budgetCostCodes.id, params.context.costCodeId),
        eq(budgetCostCodes.organizationId, organizationId),
        eq(budgetCostCodes.projectId, params.context.projectId),
      ),
    )
    .limit(1);

  if (!costCode) {
    params.logger.warn(
      {
        costCodeId: params.context.costCodeId,
        projectId: params.context.projectId,
        organizationId,
      },
      "Budget narrative persistence skipped: cost code not found",
    );
    return { handled: false as const, reason: "cost_code_not_found" as const };
  }

  const varianceBps =
    readNumber(params.context.varianceBps) ?? calculateVarianceBps(costCode.budgetCents, costCode.actualCents);
  const severity = severityFromVarianceBps(varianceBps);
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [existingAlert] = await db
    .select()
    .from(budgetAlerts)
    .where(
      and(
        eq(budgetAlerts.organizationId, organizationId),
        eq(budgetAlerts.projectId, params.context.projectId),
        eq(budgetAlerts.costCodeId, params.context.costCodeId),
        eq(budgetAlerts.severity, severity),
        isNull(budgetAlerts.resolvedAt),
        gte(budgetAlerts.createdAt, cutoffTime),
      ),
    )
    .orderBy(desc(budgetAlerts.createdAt))
    .limit(1);

  if (existingAlert) {
    return {
      handled: true as const,
      created: false as const,
      duplicateOf: existingAlert.id,
      severity,
    };
  }

  const [alert] = await db
    .insert(budgetAlerts)
    .values({
      organizationId,
      projectId: params.context.projectId,
      costCodeId: params.context.costCodeId,
      severity,
      narrative: narrative.slice(0, 4000),
    })
    .returning();

  return {
    handled: true as const,
    created: true as const,
    alertId: alert.id,
    severity,
  };
}