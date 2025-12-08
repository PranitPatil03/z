import { Router } from "express";
import {
  analyzeSiteSnapController,
  createSiteSnapController,
  createSiteSnapObservationController,
  deleteSiteSnapObservationController,
  getSiteSnapController,
  getSiteSnapDailyProgressController,
  listSiteSnapsController,
  reanalyzeSiteSnapController,
  reviewSiteSnapController,
  updateSiteSnapController,
  updateSiteSnapObservationController,
} from "../controllers/site-snap";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams, validateQuery } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import {
  createObservationSchema,
  createSiteSnapSchema,
  dailyProgressQuerySchema,
  listSiteSnapsQuerySchema,
  siteSnapIdParamsSchema,
  siteSnapObservationParamsSchema,
  updateObservationSchema,
  updateSiteSnapSchema,
} from "../schemas/site-snap.schema";

export const siteSnapsRouter = Router();

siteSnapsRouter.use(requireAuth);

siteSnapsRouter.get("/", validateQuery(listSiteSnapsQuerySchema), asyncHandler(listSiteSnapsController));
siteSnapsRouter.post("/", validateBody(createSiteSnapSchema), asyncHandler(createSiteSnapController));
siteSnapsRouter.get("/daily-progress", validateQuery(dailyProgressQuerySchema), asyncHandler(getSiteSnapDailyProgressController));
siteSnapsRouter.get("/:siteSnapId", validateParams(siteSnapIdParamsSchema), asyncHandler(getSiteSnapController));
siteSnapsRouter.patch("/:siteSnapId", validateParams(siteSnapIdParamsSchema), validateBody(updateSiteSnapSchema), asyncHandler(updateSiteSnapController));
siteSnapsRouter.post("/:siteSnapId/analyze", validateParams(siteSnapIdParamsSchema), asyncHandler(analyzeSiteSnapController));
siteSnapsRouter.post("/:siteSnapId/reanalyze", validateParams(siteSnapIdParamsSchema), asyncHandler(reanalyzeSiteSnapController));
siteSnapsRouter.post("/:siteSnapId/review", validateParams(siteSnapIdParamsSchema), asyncHandler(reviewSiteSnapController));
siteSnapsRouter.post("/:siteSnapId/observations", validateParams(siteSnapIdParamsSchema), validateBody(createObservationSchema), asyncHandler(createSiteSnapObservationController));
siteSnapsRouter.patch("/:siteSnapId/observations/:observationId", validateParams(siteSnapObservationParamsSchema), validateBody(updateObservationSchema), asyncHandler(updateSiteSnapObservationController));
siteSnapsRouter.delete("/:siteSnapId/observations/:observationId", validateParams(siteSnapObservationParamsSchema), asyncHandler(deleteSiteSnapObservationController));
