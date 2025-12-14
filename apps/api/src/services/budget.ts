import {
  budgetAlerts,
  budgetCostCodes,
  budgetCostEntries,
  budgetProjectSettings,
  changeOrders,
  invoices,
  purchaseOrders,
} from "@foreman/db";
import { and, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import type { Request } from "express";
import { env } from "../config/env";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  budgetCostCodeDrilldownQuerySchema,
  budgetCostCodeEntryParamsSchema,
  budgetCostCodeIdParamsSchema,
  budgetProjectSettingsQuerySchema,
  createBudgetCostCodeSchema,
  createBudgetCostEntrySchema,
  listBudgetCostEntriesQuerySchema,
  listBudgetQuerySchema,
  updateBudgetCostCodeSchema,
  upsertBudgetProjectSettingsSchema,
} from "../schemas/budget.schema";
import { eventService } from "./events";

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
  return { orgId: session.activeOrganizationId, userId: user.id };
}

function varianceBps(item: { budgetCents: number; actualCents: number }) {
  if (item.budgetCents <= 0) {
    return 0;
  }
  return Math.round(
    ((item.actualCents - item.budgetCents) * 10000) / item.budgetCents,
  );
}

function billedPercentOfCommittedBps(item: {
  billedCents: number;
  committedCents: number;
}) {
  if (item.committedCents <= 0) {
    return 0;
  }
  return Math.round((item.billedCents * 10000) / item.committedCents);
}

function defaultAlertThresholdBps() {
  return env.BUDGET_DEFAULT_ALERT_THRESHOLD_BPS ?? 500;
}

function effectiveAlertThresholdBps(
  costCodeThresholdBps: number,
  projectThresholdBps?: number | null,
) {
  if (typeof projectThresholdBps !== "number") {
    return costCodeThresholdBps;
  }
  return Math.min(costCodeThresholdBps, projectThresholdBps);
}

function severityFromVariance(bps: number) {
  const positiveBps = Math.max(0, bps);
  if (positiveBps >= 2000) {
    return "critical";
  }
  if (positiveBps >= 1000) {
    return "high";
  }
  if (positiveBps >= 500) {
    return "medium";
  }
  return "low";
}

function toBudgetMetrics(record: {
  budgetCents: number;
  committedCents: number;
  actualCents: number;
  billedCents: number;
}) {
  const budgetMinusCommittedCents = record.budgetCents - record.committedCents;
  const committedMinusActualCents = record.committedCents - record.actualCents;
  const budgetMinusActualCents = record.budgetCents - record.actualCents;
  const varianceBpsValue = varianceBps({
    budgetCents: record.budgetCents,
    actualCents: record.actualCents,
  });
  const billedPercentOfCommittedBpsValue = billedPercentOfCommittedBps({
    billedCents: record.billedCents,
    committedCents: record.committedCents,
  });

  return {
    budgetMinusCommittedCents,
    committedMinusActualCents,
    budgetMinusActualCents,
    varianceBps: varianceBpsValue,
    billedPercentOfCommittedBps: billedPercentOfCommittedBpsValue,
  };
}

async function loadProjectSetting(orgId: string, projectId: string) {
  const [setting] = await db
    .select()
    .from(budgetProjectSettings)
    .where(
      and(
        eq(budgetProjectSettings.organizationId, orgId),
        eq(budgetProjectSettings.projectId, projectId),
      ),
    )
    .limit(1);

  return setting ?? null;
}

async function ensureCostCode(orgId: string, costCodeId: string) {
  const [costCode] = await db
    .select()
    .from(budgetCostCodes)
    .where(
      and(
        eq(budgetCostCodes.organizationId, orgId),
        eq(budgetCostCodes.id, costCodeId),
      ),
    )
    .limit(1);

  if (!costCode) {
    throw notFound("Budget cost code not found");
  }

  return costCode;
}

async function recalculateFromEntries(orgId: string, costCodeId: string) {
  const entries = await db
    .select()
    .from(budgetCostEntries)
    .where(
      and(
        eq(budgetCostEntries.organizationId, orgId),
        eq(budgetCostEntries.costCodeId, costCodeId),
      ),
    );

  const totals = entries.reduce(
    (acc, entry) => {
      if (entry.entryType === "committed") {
        acc.committedCents += entry.amountCents;
      }
      if (entry.entryType === "actual") {
        acc.actualCents += entry.amountCents;
      }
      if (entry.entryType === "billed") {
        acc.billedCents += entry.amountCents;
      }
      return acc;
    },
    { committedCents: 0, actualCents: 0, billedCents: 0 },
  );

  const [record] = await db
    .update(budgetCostCodes)
    .set({
      committedCents: totals.committedCents,
      actualCents: totals.actualCents,
      billedCents: totals.billedCents,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(budgetCostCodes.id, costCodeId),
        eq(budgetCostCodes.organizationId, orgId),
      ),
    )
    .returning();

  if (!record) {
    throw notFound("Budget cost code not found");
  }

  return record;
}

async function maybeCreateThresholdAlert(input: {
  orgId: string;
  projectId: string;
  costCode: typeof budgetCostCodes.$inferSelect;
  thresholdBps: number;
}) {
  const metrics = toBudgetMetrics(input.costCode);
  if (metrics.varianceBps < input.thresholdBps) {
    return null;
  }

  const severity = severityFromVariance(metrics.varianceBps);
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [existing] = await db
    .select()
    .from(budgetAlerts)
    .where(
      and(
        eq(budgetAlerts.organizationId, input.orgId),
        eq(budgetAlerts.projectId, input.projectId),
        eq(budgetAlerts.costCodeId, input.costCode.id),
        eq(budgetAlerts.severity, severity),
        isNull(budgetAlerts.resolvedAt),
        gte(budgetAlerts.createdAt, cutoffTime),
      ),
    )
    .orderBy(desc(budgetAlerts.createdAt))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(budgetAlerts)
    .values({
      organizationId: input.orgId,
      projectId: input.projectId,
      costCodeId: input.costCode.id,
      severity,
      narrative:
        `Cost code ${input.costCode.code} exceeded threshold ` +
        `(${Math.round(input.thresholdBps / 100)}%). Variance is ${Math.round(metrics.varianceBps / 100)}% ` +
        `with budget ${input.costCode.budgetCents}, actual ${input.costCode.actualCents}, committed ${input.costCode.committedCents}.`,
    })
    .returning();

  await eventService.emit({
    event: "budget.threshold_exceeded",
    organizationId: input.orgId,
    title: "Budget Threshold Exceeded",
    message: `Cost code ${input.costCode.code} exceeded budget threshold.`,
    metadata: {
      costCodeId: input.costCode.id,
      projectId: input.projectId,
      thresholdBps: input.thresholdBps,
      varianceBps: metrics.varianceBps,
    },
  });

  return created ?? null;
}

async function validateSourceLink(input: {
  orgId: string;
  projectId: string;
  sourceType:
    | "change_order"
    | "purchase_order"
    | "invoice"
    | "payment_application"
    | "manual"
    | "other";
  sourceId?: string;
  entryType: "committed" | "actual" | "billed";
}) {
  if (input.sourceType === "change_order") {
    const [record] = await db
      .select()
      .from(changeOrders)
      .where(
        and(
          eq(changeOrders.id, input.sourceId ?? ""),
          eq(changeOrders.organizationId, input.orgId),
          eq(changeOrders.projectId, input.projectId),
        ),
      )
      .limit(1);

    if (!record) {
      throw badRequest("Linked change order was not found for this project");
    }

    if (input.entryType === "committed" && record.status !== "approved") {
      throw badRequest(
        "Committed entries can only link to approved change orders",
      );
    }

    return { sourceRef: record.title };
  }

  if (input.sourceType === "purchase_order") {
    const [record] = await db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, input.sourceId ?? ""),
          eq(purchaseOrders.organizationId, input.orgId),
          eq(purchaseOrders.projectId, input.projectId),
        ),
      )
      .limit(1);

    if (!record) {
      throw badRequest("Linked purchase order was not found for this project");
    }

    if (
      input.entryType === "committed" &&
      !["issued", "approved"].includes(record.status)
    ) {
      throw badRequest(
        "Committed entries can only link to issued or approved purchase orders",
      );
    }

    return { sourceRef: record.poNumber };
  }

  if (input.sourceType === "invoice") {
    const [record] = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.id, input.sourceId ?? ""),
          eq(invoices.organizationId, input.orgId),
          eq(invoices.projectId, input.projectId),
        ),
      )
      .limit(1);

    if (!record) {
      throw badRequest("Linked invoice was not found for this project");
    }

    if (
      input.entryType === "actual" &&
      !["approved", "paid"].includes(record.status)
    ) {
      throw badRequest(
        "Actual entries can only link to approved or paid invoices",
      );
    }

    if (
      input.entryType === "billed" &&
      !["submitted", "approved", "paid"].includes(record.status)
    ) {
      throw badRequest(
        "Billed entries can only link to submitted, approved, or paid invoices",
      );
    }

    return { sourceRef: record.invoiceNumber };
  }

  return { sourceRef: null as string | null };
}

export const budgetService = {
  async listCostCodes(request: Request) {
    const { orgId } = requireContext(request);
    const query = listBudgetQuerySchema.parse(readValidatedQuery(request));

    const [codes, projectSetting] = await Promise.all([
      db
        .select()
        .from(budgetCostCodes)
        .where(
          and(
            eq(budgetCostCodes.organizationId, orgId),
            eq(budgetCostCodes.projectId, query.projectId),
          ),
        ),
      loadProjectSetting(orgId, query.projectId),
    ]);

    const projectThresholdBps = projectSetting?.alertThresholdBps ?? null;
    return codes.map((code) => {
      const metrics = toBudgetMetrics(code);
      return {
        ...code,
        metrics,
        effectiveAlertThresholdBps: effectiveAlertThresholdBps(
          code.alertThresholdBps,
          projectThresholdBps,
        ),
      };
    });
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

    return {
      ...record,
      metrics: toBudgetMetrics(record),
    };
  },

  async updateCostCode(request: Request) {
    const { orgId } = requireContext(request);
    const params = budgetCostCodeIdParamsSchema.parse(
      readValidatedParams(request),
    );
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
      .where(
        and(
          eq(budgetCostCodes.id, params.costCodeId),
          eq(budgetCostCodes.organizationId, orgId),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Budget cost code not found");
    }

    const projectSetting = await loadProjectSetting(orgId, record.projectId);
    const thresholdBps = effectiveAlertThresholdBps(
      record.alertThresholdBps,
      projectSetting?.alertThresholdBps,
    );
    const alert = await maybeCreateThresholdAlert({
      orgId,
      projectId: record.projectId,
      costCode: record,
      thresholdBps,
    });

    return {
      ...record,
      metrics: toBudgetMetrics(record),
      effectiveAlertThresholdBps: thresholdBps,
      thresholdAlert: alert,
    };
  },

  async variance(request: Request) {
    const { orgId } = requireContext(request);
    const query = listBudgetQuerySchema.parse(readValidatedQuery(request));

    const codes = await db
      .select()
      .from(budgetCostCodes)
      .where(
        and(
          eq(budgetCostCodes.organizationId, orgId),
          eq(budgetCostCodes.projectId, query.projectId),
        ),
      );

    const projectSetting = await loadProjectSetting(orgId, query.projectId);
    const projectThresholdBps =
      projectSetting?.alertThresholdBps ?? defaultAlertThresholdBps();

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

    const totalsMetrics = toBudgetMetrics({
      budgetCents: totals.budgetCents,
      committedCents: totals.committedCents,
      actualCents: totals.actualCents,
      billedCents: totals.billedCents,
    });

    return {
      totals,
      metrics: totalsMetrics,
      projectAlertThresholdBps: projectThresholdBps,
      byCostCode: codes.map((code) => ({
        ...code,
        metrics: toBudgetMetrics(code),
        effectiveAlertThresholdBps: effectiveAlertThresholdBps(
          code.alertThresholdBps,
          projectThresholdBps,
        ),
      })),
    };
  },

  async reconciliation(request: Request) {
    const { orgId } = requireContext(request);
    const query = listBudgetQuerySchema.parse(readValidatedQuery(request));

    const [codes, alerts, entries, projectSetting] = await Promise.all([
      db
        .select()
        .from(budgetCostCodes)
        .where(
          and(
            eq(budgetCostCodes.organizationId, orgId),
            eq(budgetCostCodes.projectId, query.projectId),
          ),
        ),
      db
        .select()
        .from(budgetAlerts)
        .where(
          and(
            eq(budgetAlerts.organizationId, orgId),
            eq(budgetAlerts.projectId, query.projectId),
          ),
        )
        .orderBy(desc(budgetAlerts.createdAt)),
      db
        .select()
        .from(budgetCostEntries)
        .where(
          and(
            eq(budgetCostEntries.organizationId, orgId),
            eq(budgetCostEntries.projectId, query.projectId),
          ),
        ),
      loadProjectSetting(orgId, query.projectId),
    ]);

    const entryStatsByCostCode = entries.reduce<
      Record<
        string,
        { count: number; committed: number; actual: number; billed: number }
      >
    >((acc, entry) => {
      if (!acc[entry.costCodeId]) {
        acc[entry.costCodeId] = {
          count: 0,
          committed: 0,
          actual: 0,
          billed: 0,
        };
      }
      acc[entry.costCodeId].count += 1;
      if (entry.entryType === "committed") {
        acc[entry.costCodeId].committed += entry.amountCents;
      }
      if (entry.entryType === "actual") {
        acc[entry.costCodeId].actual += entry.amountCents;
      }
      if (entry.entryType === "billed") {
        acc[entry.costCodeId].billed += entry.amountCents;
      }
      return acc;
    }, {});

    const alertsByCostCode = alerts.reduce<Record<string, typeof alerts>>(
      (acc, alert) => {
        if (!acc[alert.costCodeId]) {
          acc[alert.costCodeId] = [];
        }
        acc[alert.costCodeId].push(alert);
        return acc;
      },
      {},
    );

    const projectThresholdBps =
      projectSetting?.alertThresholdBps ?? defaultAlertThresholdBps();

    return {
      items: codes.map((code) => ({
        id: code.id,
        code: code.code,
        name: code.name,
        budgetCents: code.budgetCents,
        committedCents: code.committedCents,
        actualCents: code.actualCents,
        billedCents: code.billedCents,
        metrics: toBudgetMetrics(code),
        effectiveAlertThresholdBps: effectiveAlertThresholdBps(
          code.alertThresholdBps,
          projectThresholdBps,
        ),
        entryStats: entryStatsByCostCode[code.id] ?? {
          count: 0,
          committed: 0,
          actual: 0,
          billed: 0,
        },
        latestAlert: alertsByCostCode[code.id]?.[0] ?? null,
      })),
      projectAlertThresholdBps: projectThresholdBps,
      alerts,
      unresolvedAlertCount: alerts.filter((alert) => alert.resolvedAt === null)
        .length,
      entryCount: entries.length,
    };
  },

  async getSettings(request: Request) {
    const { orgId } = requireContext(request);
    const query = budgetProjectSettingsQuerySchema.parse(
      readValidatedQuery(request),
    );

    const setting = await loadProjectSetting(orgId, query.projectId);
    if (!setting) {
      return {
        projectId: query.projectId,
        alertThresholdBps: defaultAlertThresholdBps(),
        source: "default",
      };
    }

    return {
      ...setting,
      source: "project",
    };
  },

  async upsertSettings(request: Request) {
    const { orgId } = requireContext(request);
    const body = upsertBudgetProjectSettingsSchema.parse(
      readValidatedBody(request),
    );

    const [record] = await db
      .insert(budgetProjectSettings)
      .values({
        organizationId: orgId,
        projectId: body.projectId,
        alertThresholdBps: body.alertThresholdBps,
      })
      .onConflictDoUpdate({
        target: [
          budgetProjectSettings.organizationId,
          budgetProjectSettings.projectId,
        ],
        set: {
          alertThresholdBps: body.alertThresholdBps,
          updatedAt: new Date(),
        },
      })
      .returning();

    return record;
  },

  async listEntries(request: Request) {
    const { orgId } = requireContext(request);
    const params = budgetCostCodeEntryParamsSchema.parse(
      readValidatedParams(request),
    );
    const query = listBudgetCostEntriesQuerySchema.parse(
      readValidatedQuery(request),
    );

    const costCode = await ensureCostCode(orgId, params.costCodeId);
    if (costCode.projectId !== query.projectId) {
      throw badRequest("Cost code does not belong to provided project");
    }

    const conditions = [
      eq(budgetCostEntries.organizationId, orgId),
      eq(budgetCostEntries.projectId, query.projectId),
      eq(budgetCostEntries.costCodeId, params.costCodeId),
    ];

    if (query.entryType) {
      conditions.push(eq(budgetCostEntries.entryType, query.entryType));
    }

    if (query.sourceType) {
      conditions.push(eq(budgetCostEntries.sourceType, query.sourceType));
    }

    return await db
      .select()
      .from(budgetCostEntries)
      .where(and(...conditions))
      .orderBy(
        desc(budgetCostEntries.occurredAt),
        desc(budgetCostEntries.createdAt),
      )
      .limit(query.limit);
  },

  async createEntry(request: Request) {
    const { orgId, userId } = requireContext(request);
    const params = budgetCostCodeEntryParamsSchema.parse(
      readValidatedParams(request),
    );
    const body = createBudgetCostEntrySchema.parse(readValidatedBody(request));

    const costCode = await ensureCostCode(orgId, params.costCodeId);
    if (costCode.projectId !== body.projectId) {
      throw badRequest("Cost code does not belong to provided project");
    }

    const sourceValidation = await validateSourceLink({
      orgId,
      projectId: body.projectId,
      sourceType: body.sourceType,
      sourceId: body.sourceId,
      entryType: body.entryType,
    });

    const [entry] = await db
      .insert(budgetCostEntries)
      .values({
        organizationId: orgId,
        projectId: body.projectId,
        costCodeId: costCode.id,
        entryType: body.entryType,
        sourceType: body.sourceType,
        sourceId: body.sourceId ?? null,
        sourceRef: body.sourceRef ?? sourceValidation.sourceRef,
        amountCents: body.amountCents,
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
        notes: body.notes ?? null,
        metadata: body.metadata ?? null,
        createdByUserId: userId,
      })
      .returning();

    const updatedCostCode = await recalculateFromEntries(orgId, costCode.id);
    const projectSetting = await loadProjectSetting(orgId, body.projectId);
    const thresholdBps = effectiveAlertThresholdBps(
      updatedCostCode.alertThresholdBps,
      projectSetting?.alertThresholdBps,
    );
    const thresholdAlert = await maybeCreateThresholdAlert({
      orgId,
      projectId: body.projectId,
      costCode: updatedCostCode,
      thresholdBps,
    });

    return {
      entry,
      costCode: updatedCostCode,
      metrics: toBudgetMetrics(updatedCostCode),
      effectiveAlertThresholdBps: thresholdBps,
      thresholdAlert,
    };
  },

  async drilldown(request: Request) {
    const { orgId } = requireContext(request);
    const params = budgetCostCodeEntryParamsSchema.parse(
      readValidatedParams(request),
    );
    const query = budgetCostCodeDrilldownQuerySchema.parse(
      readValidatedQuery(request),
    );

    const costCode = await ensureCostCode(orgId, params.costCodeId);
    if (costCode.projectId !== query.projectId) {
      throw badRequest("Cost code does not belong to provided project");
    }

    const [projectSetting, entries, alerts] = await Promise.all([
      loadProjectSetting(orgId, query.projectId),
      db
        .select()
        .from(budgetCostEntries)
        .where(
          and(
            eq(budgetCostEntries.organizationId, orgId),
            eq(budgetCostEntries.projectId, query.projectId),
            eq(budgetCostEntries.costCodeId, costCode.id),
          ),
        )
        .orderBy(
          desc(budgetCostEntries.occurredAt),
          desc(budgetCostEntries.createdAt),
        )
        .limit(query.limit),
      db
        .select()
        .from(budgetAlerts)
        .where(
          and(
            eq(budgetAlerts.organizationId, orgId),
            eq(budgetAlerts.costCodeId, costCode.id),
          ),
        )
        .orderBy(desc(budgetAlerts.createdAt))
        .limit(query.limit),
    ]);

    const changeOrderIds = Array.from(
      new Set(
        entries
          .filter((entry) => entry.sourceType === "change_order")
          .map((entry) => entry.sourceId)
          .filter(
            (sourceId): sourceId is string => typeof sourceId === "string",
          ),
      ),
    );
    const purchaseOrderIds = Array.from(
      new Set(
        entries
          .filter((entry) => entry.sourceType === "purchase_order")
          .map((entry) => entry.sourceId)
          .filter(
            (sourceId): sourceId is string => typeof sourceId === "string",
          ),
      ),
    );
    const invoiceIds = Array.from(
      new Set(
        entries
          .filter((entry) => entry.sourceType === "invoice")
          .map((entry) => entry.sourceId)
          .filter(
            (sourceId): sourceId is string => typeof sourceId === "string",
          ),
      ),
    );

    const [changeOrderRecords, purchaseOrderRecords, invoiceRecords] =
      await Promise.all([
        changeOrderIds.length > 0
          ? db
              .select({
                id: changeOrders.id,
                title: changeOrders.title,
                status: changeOrders.status,
              })
              .from(changeOrders)
              .where(
                and(
                  eq(changeOrders.organizationId, orgId),
                  inArray(changeOrders.id, changeOrderIds),
                ),
              )
          : Promise.resolve([]),
        purchaseOrderIds.length > 0
          ? db
              .select({
                id: purchaseOrders.id,
                poNumber: purchaseOrders.poNumber,
                status: purchaseOrders.status,
              })
              .from(purchaseOrders)
              .where(
                and(
                  eq(purchaseOrders.organizationId, orgId),
                  inArray(purchaseOrders.id, purchaseOrderIds),
                ),
              )
          : Promise.resolve([]),
        invoiceIds.length > 0
          ? db
              .select({
                id: invoices.id,
                invoiceNumber: invoices.invoiceNumber,
                status: invoices.status,
              })
              .from(invoices)
              .where(
                and(
                  eq(invoices.organizationId, orgId),
                  inArray(invoices.id, invoiceIds),
                ),
              )
          : Promise.resolve([]),
      ]);

    const changeOrderById = new Map(
      changeOrderRecords.map((row) => [row.id, row]),
    );
    const purchaseOrderById = new Map(
      purchaseOrderRecords.map((row) => [row.id, row]),
    );
    const invoiceById = new Map(invoiceRecords.map((row) => [row.id, row]));

    const entryTotals = entries.reduce(
      (acc, entry) => {
        if (entry.entryType === "committed") {
          acc.committedCents += entry.amountCents;
        }
        if (entry.entryType === "actual") {
          acc.actualCents += entry.amountCents;
        }
        if (entry.entryType === "billed") {
          acc.billedCents += entry.amountCents;
        }
        return acc;
      },
      { committedCents: 0, actualCents: 0, billedCents: 0 },
    );

    return {
      costCode: {
        ...costCode,
        metrics: toBudgetMetrics(costCode),
        effectiveAlertThresholdBps: effectiveAlertThresholdBps(
          costCode.alertThresholdBps,
          projectSetting?.alertThresholdBps,
        ),
      },
      entryTotals,
      entries: entries.map((entry) => {
        const sourceEntity = (() => {
          if (!entry.sourceId) {
            return null;
          }
          if (entry.sourceType === "change_order") {
            return changeOrderById.get(entry.sourceId) ?? null;
          }
          if (entry.sourceType === "purchase_order") {
            return purchaseOrderById.get(entry.sourceId) ?? null;
          }
          if (entry.sourceType === "invoice") {
            return invoiceById.get(entry.sourceId) ?? null;
          }
          return null;
        })();

        return {
          ...entry,
          sourceEntity,
        };
      }),
      alerts,
    };
  },
};
