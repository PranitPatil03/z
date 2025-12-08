import type { Request, Response } from "express";
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
