import type { Request, Response } from "express";
import { badRequest } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import { deduplicateAlertsSchema, queueNarrativesSchema } from "../schemas/budget.schema";
import { budgetNarrativeService } from "../services/budget-narrative";
import { budgetService } from "../services/budget";

export async function listBudgetCostCodesController(request: Request, response: Response) {
  const data = await budgetService.listCostCodes(request);
  response.json({ data });
}

export async function createBudgetCostCodeController(request: Request, response: Response) {
  const data = await budgetService.createCostCode(request);
  response.status(201).json({ data });
}

export async function updateBudgetCostCodeController(request: Request, response: Response) {
  const data = await budgetService.updateCostCode(request);
  response.json({ data });
}

export async function getBudgetVarianceController(request: Request, response: Response) {
  const data = await budgetService.variance(request);
  response.json({ data });
}

export async function getBudgetReconciliationController(request: Request, response: Response) {
  const data = await budgetService.reconciliation(request);
  response.json({ data });
}

export async function getBudgetSettingsController(request: Request, response: Response) {
  const data = await budgetService.getSettings(request);
  response.json({ data });
}

export async function upsertBudgetSettingsController(request: Request, response: Response) {
  const data = await budgetService.upsertSettings(request);
  response.json({ data });
}

export async function listBudgetCostCodeEntriesController(request: Request, response: Response) {
  const data = await budgetService.listEntries(request);
  response.json({ data });
}

export async function createBudgetCostCodeEntryController(request: Request, response: Response) {
  const data = await budgetService.createEntry(request);
  response.status(201).json({ data });
}

export async function getBudgetCostCodeDrilldownController(request: Request, response: Response) {
  const data = await budgetService.drilldown(request);
  response.json({ data });
}

export async function queueBudgetNarrativesController(request: Request, response: Response) {
  const { session } = getAuthContext(request);
  if (!session.activeOrganizationId) {
    throw badRequest("An active organization is required");
  }

  const body = queueNarrativesSchema.parse((request as ValidatedRequest).validated?.body ?? {});
  const data = await budgetNarrativeService.queueNarrativesForProject(session.activeOrganizationId, body.projectId);
  response.json({ data });
}

export async function deduplicateBudgetAlertsController(request: Request, response: Response) {
  const { session } = getAuthContext(request);
  if (!session.activeOrganizationId) {
    throw badRequest("An active organization is required");
  }

  const body = deduplicateAlertsSchema.parse((request as ValidatedRequest).validated?.body ?? {});

  const data = await budgetNarrativeService.deduplicateAlerts(
    session.activeOrganizationId,
    body.projectId,
    body.maxAgeHours,
  );
  response.json({ data });
}
