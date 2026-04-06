import { generateAiCompletion } from "@foreman/ai";
import { and, desc, eq, inArray } from "drizzle-orm";
import { budgetAlerts, budgetCostCodes, budgetCostEntries, budgetProjectSettings, changeOrders, invoices } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest } from "../lib/errors";
import { enqueueAiTask } from "../lib/queues";
import { env } from "../config/env";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";

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

function budgetNarrativeModel() {
  return env.BUDGET_AI_MODEL ?? "gpt-4.1-mini";
}

function effectiveThresholdBps(costCodeThresholdBps: number, projectThresholdBps?: number | null) {
  if (typeof projectThresholdBps !== "number") {
    return costCodeThresholdBps;
  }
  return Math.min(costCodeThresholdBps, projectThresholdBps);
}

function severityFromVariancePercent(variancePercent: number) {
  const overrunPercent = Math.max(0, variancePercent);
  if (overrunPercent >= 20) {
    return "critical";
  }
  if (overrunPercent >= 10) {
    return "high";
  }
  if (overrunPercent >= 5) {
    return "medium";
  }
  return "low";
}

async function loadProjectSetting(orgId: string, projectId: string) {
  const [setting] = await db
    .select()
    .from(budgetProjectSettings)
    .where(and(eq(budgetProjectSettings.organizationId, orgId), eq(budgetProjectSettings.projectId, projectId)))
    .limit(1);

  return setting ?? null;
}

async function buildNarrativeContext(orgId: string, projectId: string, costCodeId: string) {
  const [entries, recentInvoices, recentChangeOrders] = await Promise.all([
    db
      .select()
      .from(budgetCostEntries)
      .where(
        and(
          eq(budgetCostEntries.organizationId, orgId),
          eq(budgetCostEntries.projectId, projectId),
          eq(budgetCostEntries.costCodeId, costCodeId),
        ),
      )
      .orderBy(desc(budgetCostEntries.occurredAt), desc(budgetCostEntries.createdAt))
      .limit(5),
    db
      .select()
      .from(invoices)
      .where(and(eq(invoices.organizationId, orgId), eq(invoices.projectId, projectId)))
      .orderBy(desc(invoices.createdAt))
      .limit(1),
    db
      .select()
      .from(changeOrders)
      .where(and(eq(changeOrders.organizationId, orgId), eq(changeOrders.projectId, projectId)))
      .orderBy(desc(changeOrders.createdAt))
      .limit(1),
  ]);

  const recentInvoice = recentInvoices[0];
  const recentChangeOrder = recentChangeOrders[0];

  const entryLines = entries.length > 0
    ? entries
        .map((entry) => {
          const source = entry.sourceRef ?? entry.sourceId ?? "n/a";
          return `- ${entry.entryType} ${entry.amountCents} (${entry.sourceType}:${source})`;
        })
        .join("\n")
    : "- none";

  return {
    entryLines,
    recentInvoiceLine: recentInvoice
      ? `Recent invoice: #${recentInvoice.invoiceNumber} (${recentInvoice.status}) amount ${recentInvoice.totalAmountCents}`
      : "Recent invoice: none",
    recentChangeOrderLine: recentChangeOrder
      ? `Recent change order: ${recentChangeOrder.title} (${recentChangeOrder.status}) impact ${recentChangeOrder.impactCostCents}`
      : "Recent change order: none",
  };
}

export const budgetNarrativeService = {
  async generateNarrative(costCodeId: string, orgId: string, dryRun: boolean = false) {
    const [costCode] = await db
      .select()
      .from(budgetCostCodes)
      .where(and(eq(budgetCostCodes.id, costCodeId), eq(budgetCostCodes.organizationId, orgId)));

    if (!costCode) {
      return { success: false, message: "Cost code not found" };
    }

    const [projectSetting, narrativeContext] = await Promise.all([
      loadProjectSetting(orgId, costCode.projectId),
      buildNarrativeContext(orgId, costCode.projectId, costCode.id),
    ]);

    const variance = costCode.budgetCents > 0
      ? ((costCode.actualCents - costCode.budgetCents) * 10000) / costCode.budgetCents
      : 0;

    const variancePercent = Math.round(variance / 100);
    const effectiveThreshold = effectiveThresholdBps(costCode.alertThresholdBps, projectSetting?.alertThresholdBps);

    const [relevantInvoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.organizationId, orgId), eq(invoices.projectId, costCode.projectId)))
      .limit(1);

    const context = `
Cost Code: ${costCode.code}
Name: ${costCode.name}
Budget: $${(costCode.budgetCents / 100).toFixed(2)}
Actual Spend: $${(costCode.actualCents / 100).toFixed(2)}
Variance: ${variancePercent}%
Committed: $${(costCode.committedCents / 100).toFixed(2)}
Billed: $${(costCode.billedCents / 100).toFixed(2)}
Effective Alert Threshold: ${Math.round(effectiveThreshold / 100)}%
Linked Entries:
${narrativeContext.entryLines}
${relevantInvoice ? `Recent Invoice: #${relevantInvoice.invoiceNumber} for $${(relevantInvoice.totalAmountCents / 100).toFixed(2)}` : ""}
${narrativeContext.recentInvoiceLine}
${narrativeContext.recentChangeOrderLine}
    `;

    const prompt = `Generate a concise, non-technical narrative (2-3 sentences max) explaining this budget variance and its implications. Be specific about the numbers and actionable.

${context}

Format: Start with observation, mention root cause if obvious, end with action.`;

    try {
      const narrative = dryRun
        ? "[DRY RUN] Would generate narrative for " + costCode.code
        : await generateAiCompletion(
            {
              provider: env.BUDGET_AI_PROVIDER,
              model: budgetNarrativeModel(),
              prompt,
              context: { costCodeId, orgId },
            },
            {
              openaiApiKey: env.OPENAI_API_KEY,
              anthropicApiKey: env.ANTHROPIC_API_KEY,
              geminiApiKey: env.GEMINI_API_KEY,
              azureOpenAiApiKey: env.AZURE_OPENAI_API_KEY,
              azureOpenAiEndpoint: env.AZURE_OPENAI_ENDPOINT,
            },
          );

      if (!dryRun) {
        const severity = severityFromVariancePercent(variancePercent);

        const [alert] = await db
          .insert(budgetAlerts)
          .values({
            organizationId: orgId,
            projectId: costCode.projectId,
            costCodeId: costCode.id,
            severity,
            narrative: typeof narrative === "object" ? narrative.output : narrative,
          })
          .returning();

        return {
          success: true,
          alert,
          narrative: alert.narrative,
        };
      }

      return {
        success: true,
        narrative: typeof narrative === "object" ? narrative.output : narrative,
        severity: severityFromVariancePercent(variancePercent),
        dryRun: true,
      };
    } catch (error) {
      return {
        success: false,
        message: `Narrative generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },

  async queueNarrativesForProject(orgId: string, projectId: string) {
    const [codes, projectSetting] = await Promise.all([
      db
        .select()
        .from(budgetCostCodes)
        .where(and(eq(budgetCostCodes.organizationId, orgId), eq(budgetCostCodes.projectId, projectId))),
      loadProjectSetting(orgId, projectId),
    ]);

    const queued = [];
    for (const code of codes) {
      const variance = code.budgetCents > 0 ? Math.abs((code.actualCents - code.budgetCents) * 10000) / code.budgetCents : 0;
      const thresholdBps = effectiveThresholdBps(code.alertThresholdBps, projectSetting?.alertThresholdBps);

      if (variance >= thresholdBps) {
        const jobId = await enqueueAiTask({
          provider: env.BUDGET_AI_PROVIDER,
          model: budgetNarrativeModel(),
          prompt: `
Cost Code Variance Alert: ${code.code} (${code.name})
Budget: $${(code.budgetCents / 100).toFixed(2)}
Actual: $${(code.actualCents / 100).toFixed(2)}
Variance: ${Math.round(variance / 100)}%
Threshold: ${Math.round(thresholdBps / 100)}%

Generate a brief, actionable narrative explaining this variance and next steps.
          `,
          context: { costCodeId: code.id, organizationId: orgId, projectId, type: "budget_narrative" },
        });

        if (jobId) {
          queued.push({ costCodeId: code.id, code: code.code, jobId });
        }
      }
    }

    return {
      queued: queued.length,
      jobs: queued,
    };
  },

  async deduplicateAlerts(orgId: string, projectId: string, maxAgeHours: number = 24) {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 3600000);

    const allAlerts = await db
      .select()
      .from(budgetAlerts)
      .where(and(eq(budgetAlerts.organizationId, orgId), eq(budgetAlerts.projectId, projectId)))
      .orderBy(desc(budgetAlerts.createdAt));

    const seen = new Map<string, typeof allAlerts[0]>();
    const duplicates: string[] = [];

    for (const alert of allAlerts) {
      const key = `${alert.costCodeId}:${alert.severity}`;

      if (seen.has(key)) {
        const prev = seen.get(key);
        if (prev && alert.createdAt > cutoffTime && prev.createdAt > cutoffTime) {
          duplicates.push(alert.id);
        }
      } else {
        seen.set(key, alert);
      }
    }

    if (duplicates.length > 0) {
      await db
        .delete(budgetAlerts)
        .where(and(eq(budgetAlerts.organizationId, orgId), inArray(budgetAlerts.id, duplicates)));
    }

    return {
      checked: allAlerts.length,
      duplicatesRemoved: duplicates.length,
    };
  },
};
