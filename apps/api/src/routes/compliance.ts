import { Router } from "express";
import {
  archiveComplianceItemController,
  createComplianceItemController,
  getComplianceItemController,
  listComplianceItemsController,
  queueComplianceInsuranceExtractionController,
  updateComplianceItemController,
} from "../controllers/compliance";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams, validateQuery } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import {
  complianceItemIdParamsSchema,
  createComplianceItemSchema,
  listComplianceItemsQuerySchema,
  queueInsuranceExtractionSchema,
  updateComplianceItemSchema,
} from "../schemas/compliance.schema";

export const complianceRouter: import("express").Router = Router();

complianceRouter.use(requireAuth);

complianceRouter.get(
  "/",
  validateQuery(listComplianceItemsQuerySchema),
  asyncHandler(listComplianceItemsController),
);
complianceRouter.post(
  "/",
  validateBody(createComplianceItemSchema),
  asyncHandler(createComplianceItemController),
);
complianceRouter.get(
  "/:complianceItemId",
  validateParams(complianceItemIdParamsSchema),
  asyncHandler(getComplianceItemController),
);
complianceRouter.patch(
  "/:complianceItemId",
  validateParams(complianceItemIdParamsSchema),
  validateBody(updateComplianceItemSchema),
  asyncHandler(updateComplianceItemController),
);
complianceRouter.delete(
  "/:complianceItemId",
  validateParams(complianceItemIdParamsSchema),
  asyncHandler(archiveComplianceItemController),
);
complianceRouter.post(
  "/:complianceItemId/insurance-extract",
  validateParams(complianceItemIdParamsSchema),
  validateBody(queueInsuranceExtractionSchema),
  asyncHandler(queueComplianceInsuranceExtractionController),
);
