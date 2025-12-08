import { Router } from "express";
import {
  createBudgetCostCodeController,
  getBudgetReconciliationController,
  getBudgetVarianceController,
  listBudgetCostCodesController,
  updateBudgetCostCodeController,
} from "../controllers/budget";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams, validateQuery } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import {
  budgetCostCodeIdParamsSchema,
  createBudgetCostCodeSchema,
  deduplicateAlertsSchema,
  listBudgetQuerySchema,
  queueNarrativesSchema,
  updateBudgetCostCodeSchema,
} from "../schemas/budget.schema";

export const budgetsRouter = Router();

budgetsRouter.use(requireAuth);

budgetsRouter.get("/cost-codes", validateQuery(listBudgetQuerySchema), asyncHandler(listBudgetCostCodesController));
budgetsRouter.post("/cost-codes", validateBody(createBudgetCostCodeSchema), asyncHandler(createBudgetCostCodeController));
budgetsRouter.patch(
  "/cost-codes/:costCodeId",
  validateParams(budgetCostCodeIdParamsSchema),
  validateBody(updateBudgetCostCodeSchema),
  asyncHandler(updateBudgetCostCodeController),
);
budgetsRouter.get("/variance", validateQuery(listBudgetQuerySchema), asyncHandler(getBudgetVarianceController));
budgetsRouter.get("/reconciliation", validateQuery(listBudgetQuerySchema), asyncHandler(getBudgetReconciliationController));
budgetsRouter.post(
  "/narratives/queue",
  validateBody(queueNarrativesSchema),
  asyncHandler(async (request, response) => {
    const service = (await import("../services/budget-narrative")).budgetNarrativeService;
      const body = ((request as unknown) as Record<string, Record<string, string>>).validated?.body || {};
    const { session } = (await import("../middleware/require-auth")).getAuthContext(request);
    const orgId = session.activeOrganizationId;
      const result = await service.queueNarrativesForProject(orgId, body.projectId || "");
    response.json(result);
  }),
);
budgetsRouter.post(
  "/alerts/deduplicate",
  validateBody(deduplicateAlertsSchema),
  asyncHandler(async (request, response) => {
    const service = (await import("../services/budget-narrative")).budgetNarrativeService;
      const body = ((request as unknown) as Record<string, Record<string, string | number>>).validated?.body || {};
    const { session } = (await import("../middleware/require-auth")).getAuthContext(request);
    const orgId = session.activeOrganizationId;
      const result = await service.deduplicateAlerts(orgId, body.projectId ? String(body.projectId) : "", (body.maxAgeHours as number) ?? 24);
    response.json(result);
  }),
);
