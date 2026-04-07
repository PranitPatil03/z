import type { Request, Response } from "express";
import { budgetNarrativeService } from "../services/budget-narrative";
import type { ValidatedRequest } from "../lib/validate";

type BudgetNarrativeRequest = ValidatedRequest & {
  appContext?: {
    orgId?: string;
  };
};

export async function generateBudgetNarrativeController(request: Request, response: Response) {
  const typedRequest = request as BudgetNarrativeRequest;
  const validated = (typedRequest.validated?.params || {}) as Record<string, string>;
  const appContext = typedRequest.appContext || {};
  const costCodeId = validated.costCodeId || "";
  const orgId = appContext.orgId || "";

  const result = await budgetNarrativeService.generateNarrative(costCodeId, orgId, false);
  response.json(result);
}

export async function queueBudgetNarrativesController(request: Request, response: Response) {
  const typedRequest = request as BudgetNarrativeRequest;
  const validated = (typedRequest.validated?.body || {}) as Record<string, string>;
  const appContext = typedRequest.appContext || {};
  const projectId = validated.projectId || "";
  const orgId = appContext.orgId || "";

  const result = await budgetNarrativeService.queueNarrativesForProject(orgId, projectId);
  response.json(result);
}

export async function deduplicateBudgetAlertsController(request: Request, response: Response) {
  const typedRequest = request as BudgetNarrativeRequest;
  const validated = (typedRequest.validated?.body || {}) as Record<string, string | number>;
  const appContext = typedRequest.appContext || {};
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
