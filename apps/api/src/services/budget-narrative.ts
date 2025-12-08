import { generateAiCompletion } from "@foreman/ai";
import { and, eq } from "drizzle-orm";
import { budgetAlerts, budgetCostCodes, changeOrders, invoices } from "@foreman/db";
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

export const budgetNarrativeService = {
  async generateNarrative(costCodeId: string, orgId: string, dryRun: boolean = false) {
    const [costCode] = await db
      .select()
      .from(budgetCostCodes)
      .where(and(eq(budgetCostCodes.id, costCodeId), eq(budgetCostCodes.organizationId, orgId)));

    if (!costCode) {
      return { success: false, message: "Cost code not found" };
    }

    const variance = costCode.budgetCents > 0
      ? ((costCode.actualCents - costCode.budgetCents) * 10000) / costCode.budgetCents
      : 0;

    const variancePercent = Math.round(variance / 100);

    const [relevantInvoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.projectId, costCode.projectId))
      .limit(1);

    const context = `
Cost Code: ${costCode.code}
Name: ${costCode.name}
Budget: $${(costCode.budgetCents / 100).toFixed(2)}
Actual Spend: $${(costCode.actualCents / 100).toFixed(2)}
Variance: ${variancePercent}%
Committed: $${(costCode.committedCents / 100).toFixed(2)}
Billed: $${(costCode.billedCents / 100).toFixed(2)}
${relevantInvoice ? `Recent Invoice: #${relevantInvoice.invoiceNumber} for $${(relevantInvoice.totalAmountCents / 100).toFixed(2)}` : ""}
    `;

    const prompt = `Generate a concise, non-technical narrative (2-3 sentences max) explaining this budget variance and its implications. Be specific about the numbers and actionable.

${context}

Format: Start with observation, mention root cause if obvious, end with action.`;

    try {
      const narrative = dryRun
        ? "[DRY RUN] Would generate narrative for " + costCode.code
        : await generateAiCompletion(
            {
              model: "gpt-4-mini",
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
        const severity = Math.abs(variancePercent) >= 20 ? "critical" : Math.abs(variancePercent) >= 10 ? "high" : "medium";

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
        severity: Math.abs(variancePercent) >= 20 ? "critical" : Math.abs(variancePercent) >= 10 ? "high" : "medium",
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
    const codes = await db
      .select()
      .from(budgetCostCodes)
      .where(and(eq(budgetCostCodes.organizationId, orgId), eq(budgetCostCodes.projectId, projectId)));

    const queued = [];
    for (const code of codes) {
      const variance = code.budgetCents > 0 ? Math.abs((code.actualCents - code.budgetCents) * 10000) / code.budgetCents : 0;

      if (variance >= (code.alertThresholdBps ?? 500)) {
        const jobId = await enqueueAiTask({
          model: "gpt-4-mini",
          prompt: `
Cost Code Variance Alert: ${code.code} (${code.name})
Budget: $${(code.budgetCents / 100).toFixed(2)}
Actual: $${(code.actualCents / 100).toFixed(2)}
Variance: ${Math.round(variance / 100)}%

Generate a brief, actionable narrative explaining this variance and next steps.
          `,
          context: { costCodeId: code.id, orgId, projectId, type: "budget_narrative" },
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
      .where(and(eq(budgetAlerts.organizationId, orgId), eq(budgetAlerts.projectId, projectId)));

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
      await db.delete(budgetAlerts).where(eq(budgetAlerts.id, duplicates[0]));
    }

    return {
      checked: allAlerts.length,
      duplicatesRemoved: duplicates.length,
    };
  },
};
