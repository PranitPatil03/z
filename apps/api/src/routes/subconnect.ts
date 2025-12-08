import { Router } from "express";
import {
  applyComplianceTemplatesController,
  archiveComplianceTemplateController,
  createComplianceTemplateController,
  getInternalDailyLogController,
  getInternalPayApplicationController,
  getLatestPrequalificationScoreController,
  listComplianceTemplatesController,
  listInternalDailyLogsController,
  listInternalPayApplicationsController,
  listSubconnectInvitationsController,
  reviewInternalDailyLogController,
  reviewInternalPayApplicationController,
  updateComplianceTemplateController,
  upsertPrequalificationScoreController,
} from "../controllers/subconnect";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams, validateQuery } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import {
  applyComplianceTemplatesSchema,
  complianceTemplateIdParamsSchema,
  createComplianceTemplateSchema,
  listComplianceTemplatesQuerySchema,
  updateComplianceTemplateSchema,
} from "../schemas/compliance.schema";
import {
  dailyLogIdParamsSchema,
  listInternalDailyLogsQuerySchema,
  listInternalPayApplicationsQuerySchema,
  listSubconnectInvitationsQuerySchema,
  payApplicationIdParamsSchema,
  reviewDailyLogSchema,
  reviewPayApplicationSchema,
  subcontractorIdParamsSchema,
  upsertPrequalificationScoreSchema,
} from "../schemas/subconnect.schema";

export const subconnectRouter: import("express").Router = Router();

subconnectRouter.use(requireAuth);

subconnectRouter.get(
  "/invitations",
  validateQuery(listSubconnectInvitationsQuerySchema),
  asyncHandler(listSubconnectInvitationsController),
);

subconnectRouter.post(
  "/prequalification/scores",
  validateBody(upsertPrequalificationScoreSchema),
  asyncHandler(upsertPrequalificationScoreController),
);
subconnectRouter.get(
  "/prequalification/:subcontractorId",
  validateParams(subcontractorIdParamsSchema),
  asyncHandler(getLatestPrequalificationScoreController),
);

subconnectRouter.get(
  "/compliance/templates",
  validateQuery(listComplianceTemplatesQuerySchema),
  asyncHandler(listComplianceTemplatesController),
);
subconnectRouter.post(
  "/compliance/templates",
  validateBody(createComplianceTemplateSchema),
  asyncHandler(createComplianceTemplateController),
);
subconnectRouter.patch(
  "/compliance/templates/:templateId",
  validateParams(complianceTemplateIdParamsSchema),
  validateBody(updateComplianceTemplateSchema),
  asyncHandler(updateComplianceTemplateController),
);
subconnectRouter.delete(
  "/compliance/templates/:templateId",
  validateParams(complianceTemplateIdParamsSchema),
  asyncHandler(archiveComplianceTemplateController),
);
subconnectRouter.post(
  "/compliance/templates/apply",
  validateBody(applyComplianceTemplatesSchema),
  asyncHandler(applyComplianceTemplatesController),
);

subconnectRouter.get(
  "/pay-applications",
  validateQuery(listInternalPayApplicationsQuerySchema),
  asyncHandler(listInternalPayApplicationsController),
);
subconnectRouter.get(
  "/pay-applications/:payApplicationId",
  validateParams(payApplicationIdParamsSchema),
  asyncHandler(getInternalPayApplicationController),
);
subconnectRouter.post(
  "/pay-applications/:payApplicationId/review",
  validateParams(payApplicationIdParamsSchema),
  validateBody(reviewPayApplicationSchema),
  asyncHandler(reviewInternalPayApplicationController),
);

subconnectRouter.get(
  "/daily-logs",
  validateQuery(listInternalDailyLogsQuerySchema),
  asyncHandler(listInternalDailyLogsController),
);
subconnectRouter.get(
  "/daily-logs/:dailyLogId",
  validateParams(dailyLogIdParamsSchema),
  asyncHandler(getInternalDailyLogController),
);
subconnectRouter.post(
  "/daily-logs/:dailyLogId/review",
  validateParams(dailyLogIdParamsSchema),
  validateBody(reviewDailyLogSchema),
  asyncHandler(reviewInternalDailyLogController),
);
