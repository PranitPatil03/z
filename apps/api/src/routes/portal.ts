import { Router } from "express";
import {
  portalAcceptInvitationController,
  portalCreateDailyLogController,
  portalCreatePayApplicationController,
  portalGetComplianceController,
  portalGetDailyLogController,
  portalGetOverviewController,
  portalGetPayApplicationController,
  portalGetProfileController,
  portalListDailyLogsController,
  portalListPayApplicationsController,
  portalLoginController,
  portalPasswordResetConfirmController,
  portalPasswordResetRequestController,
  portalRegisterController,
  portalUpdateComplianceController,
} from "../controllers/portal";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams, validateQuery } from "../lib/validate";
import { requirePortalAuth } from "../middleware/require-portal-auth";
import {
  dailyLogIdParamsSchema,
  payApplicationIdParamsSchema,
  portalAcceptInvitationSchema,
  portalComplianceUploadSchema,
  portalCreateDailyLogSchema,
  portalCreatePayApplicationSchema,
  portalListDailyLogsQuerySchema,
  portalListPayApplicationsQuerySchema,
  portalLoginSchema,
  portalPasswordResetConfirmSchema,
  portalPasswordResetRequestSchema,
  portalRegisterSchema,
} from "../schemas/portal.schema";

export const portalRouter: import("express").Router = Router();

// Public routes - no auth required
portalRouter.post(
  "/register",
  validateBody(portalRegisterSchema),
  asyncHandler(portalRegisterController),
);
portalRouter.post(
  "/login",
  validateBody(portalLoginSchema),
  asyncHandler(portalLoginController),
);
portalRouter.post(
  "/invitations/accept",
  validateBody(portalAcceptInvitationSchema),
  asyncHandler(portalAcceptInvitationController),
);
portalRouter.post(
  "/password-reset/request",
  validateBody(portalPasswordResetRequestSchema),
  asyncHandler(portalPasswordResetRequestController),
);
portalRouter.post(
  "/password-reset/confirm",
  validateBody(portalPasswordResetConfirmSchema),
  asyncHandler(portalPasswordResetConfirmController),
);

// Protected routes - portal auth required
portalRouter.use(asyncHandler(requirePortalAuth));

portalRouter.get("/profile", asyncHandler(portalGetProfileController));
portalRouter.get("/overview", asyncHandler(portalGetOverviewController));
portalRouter.get("/compliance", asyncHandler(portalGetComplianceController));
portalRouter.patch(
  "/compliance",
  validateBody(portalComplianceUploadSchema),
  asyncHandler(portalUpdateComplianceController),
);
portalRouter.get(
  "/pay-applications",
  validateQuery(portalListPayApplicationsQuerySchema),
  asyncHandler(portalListPayApplicationsController),
);
portalRouter.post(
  "/pay-applications",
  validateBody(portalCreatePayApplicationSchema),
  asyncHandler(portalCreatePayApplicationController),
);
portalRouter.get(
  "/pay-applications/:payApplicationId",
  validateParams(payApplicationIdParamsSchema),
  asyncHandler(portalGetPayApplicationController),
);
portalRouter.get(
  "/daily-logs",
  validateQuery(portalListDailyLogsQuerySchema),
  asyncHandler(portalListDailyLogsController),
);
portalRouter.post(
  "/daily-logs",
  validateBody(portalCreateDailyLogSchema),
  asyncHandler(portalCreateDailyLogController),
);
portalRouter.get(
  "/daily-logs/:dailyLogId",
  validateParams(dailyLogIdParamsSchema),
  asyncHandler(portalGetDailyLogController),
);

export default portalRouter;
