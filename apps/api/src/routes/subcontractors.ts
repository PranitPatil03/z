import { Router } from "express";
import {
  archiveSubcontractorController,
  createSubcontractorController,
  getSubcontractorController,
  inviteSubcontractorPortalController,
  listSubcontractorsController,
  updateSubcontractorController,
} from "../controllers/subcontractor";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams, validateQuery } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import {
  createSubcontractorSchema,
  inviteSubcontractorPortalSchema,
  listSubcontractorsQuerySchema,
  subcontractorIdParamsSchema,
  updateSubcontractorSchema,
} from "../schemas/subcontractor.schema";

export const subcontractorsRouter: import("express").Router = Router();

subcontractorsRouter.use(requireAuth);

subcontractorsRouter.get(
  "/",
  validateQuery(listSubcontractorsQuerySchema),
  asyncHandler(listSubcontractorsController),
);
subcontractorsRouter.post(
  "/",
  validateBody(createSubcontractorSchema),
  asyncHandler(createSubcontractorController),
);
subcontractorsRouter.get(
  "/:subcontractorId",
  validateParams(subcontractorIdParamsSchema),
  asyncHandler(getSubcontractorController),
);
subcontractorsRouter.patch(
  "/:subcontractorId",
  validateParams(subcontractorIdParamsSchema),
  validateBody(updateSubcontractorSchema),
  asyncHandler(updateSubcontractorController),
);
subcontractorsRouter.delete(
  "/:subcontractorId",
  validateParams(subcontractorIdParamsSchema),
  asyncHandler(archiveSubcontractorController),
);
subcontractorsRouter.post(
  "/:subcontractorId/portal-invite",
  validateParams(subcontractorIdParamsSchema),
  validateBody(inviteSubcontractorPortalSchema),
  asyncHandler(inviteSubcontractorPortalController),
);
