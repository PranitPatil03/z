import type { Request, Response } from "express";
import { budgetNarrativeService } from "../services/budget-narrative";

export async function generateBudgetNarrativeController(request: Request, response: Response) {
  const validated = ((request as any).validated?.params || {}) as Record<string, string>;
  const appContext = ((request as any).appContext || {}) as Record<string, string>;
  const costCodeId = validated.costCodeId || "";
  const orgId = appContext.orgId || "";

  const result = await budgetNarrativeService.generateNarrative(costCodeId, orgId, false);
  response.json(result);
}

export async function queueBudgetNarrativesController(request: Request, response: Response) {
  const validated = ((request as any).validated?.body || {}) as Record<string, string>;
  const appContext = ((request as any).appContext || {}) as Record<string, string>;
  const projectId = validated.projectId || "";
  const orgId = appContext.orgId || "";

  const result = await budgetNarrativeService.queueNarrativesForProject(orgId, projectId);
  response.json(result);
}

export async function deduplicateBudgetAlertsController(request: Request, response: Response) {
  const validated = ((request as any).validated?.body || {}) as Record<string, string | number>;
  const appContext = ((request as any).appContext || {}) as Record<string, string>;
  const projectId = String(validated.projectId || "");
  const maxAgeHours = Number(validated.maxAgeHours || 24);
  const orgId = appContext.orgId || "";

  const result = await budgetNarrativeService.deduplicateAlerts(
    orgId,
    projectId,
    maxAgeHours,
  );
  response.json(result);
}
