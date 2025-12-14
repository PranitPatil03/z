import { Router } from "express";
import {
  createBudgetCostCodeController,
  createBudgetCostCodeEntryController,
  deduplicateBudgetAlertsController,
  getBudgetCostCodeDrilldownController,
  getBudgetReconciliationController,
  getBudgetSettingsController,
  getBudgetVarianceController,
  listBudgetCostCodeEntriesController,
  listBudgetCostCodesController,
  queueBudgetNarrativesController,
  updateBudgetCostCodeController,
  upsertBudgetSettingsController,
} from "../controllers/budget";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams, validateQuery } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import {
  budgetCostCodeDrilldownQuerySchema,
  budgetCostCodeEntryParamsSchema,
  budgetCostCodeIdParamsSchema,
  budgetProjectSettingsQuerySchema,
  createBudgetCostCodeSchema,
  createBudgetCostEntrySchema,
  deduplicateAlertsSchema,
  listBudgetCostEntriesQuerySchema,
  listBudgetQuerySchema,
  queueNarrativesSchema,
  updateBudgetCostCodeSchema,
  upsertBudgetProjectSettingsSchema,
} from "../schemas/budget.schema";

export const budgetsRouter: import("express").Router = Router();

budgetsRouter.use(requireAuth);

budgetsRouter.get(
  "/cost-codes",
  validateQuery(listBudgetQuerySchema),
  asyncHandler(listBudgetCostCodesController),
);
budgetsRouter.post(
  "/cost-codes",
  validateBody(createBudgetCostCodeSchema),
  asyncHandler(createBudgetCostCodeController),
);
budgetsRouter.get(
  "/settings",
  validateQuery(budgetProjectSettingsQuerySchema),
  asyncHandler(getBudgetSettingsController),
);
budgetsRouter.put(
  "/settings",
  validateBody(upsertBudgetProjectSettingsSchema),
  asyncHandler(upsertBudgetSettingsController),
);
budgetsRouter.patch(
  "/cost-codes/:costCodeId",
  validateParams(budgetCostCodeIdParamsSchema),
  validateBody(updateBudgetCostCodeSchema),
  asyncHandler(updateBudgetCostCodeController),
);
budgetsRouter.get(
  "/cost-codes/:costCodeId/entries",
  validateParams(budgetCostCodeEntryParamsSchema),
  validateQuery(listBudgetCostEntriesQuerySchema),
  asyncHandler(listBudgetCostCodeEntriesController),
);
budgetsRouter.post(
  "/cost-codes/:costCodeId/entries",
  validateParams(budgetCostCodeEntryParamsSchema),
  validateBody(createBudgetCostEntrySchema),
  asyncHandler(createBudgetCostCodeEntryController),
);
budgetsRouter.get(
  "/cost-codes/:costCodeId/drilldown",
  validateParams(budgetCostCodeEntryParamsSchema),
  validateQuery(budgetCostCodeDrilldownQuerySchema),
  asyncHandler(getBudgetCostCodeDrilldownController),
);
budgetsRouter.get(
  "/variance",
  validateQuery(listBudgetQuerySchema),
  asyncHandler(getBudgetVarianceController),
);
budgetsRouter.get(
  "/reconciliation",
  validateQuery(listBudgetQuerySchema),
  asyncHandler(getBudgetReconciliationController),
);
budgetsRouter.post(
  "/narratives/queue",
  validateBody(queueNarrativesSchema),
  asyncHandler(queueBudgetNarrativesController),
);
budgetsRouter.post(
  "/alerts/deduplicate",
  validateBody(deduplicateAlertsSchema),
  asyncHandler(deduplicateBudgetAlertsController),
);
