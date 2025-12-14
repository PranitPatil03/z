import { Router } from "express";
import {
  getActivityFeedController,
  getEntityTimelineController,
  getHealthScoreController,
  getProjectHealthController,
} from "../controllers/activity-feed";
import { asyncHandler } from "../lib/async-handler";
import { validateParams, validateQuery } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import {
  activityFeedEntityParamsSchema,
  activityFeedEntityTimelineQuerySchema,
  activityFeedProjectHealthParamsSchema,
  listActivityFeedQuerySchema,
} from "../schemas/activity-feed.schema";

export const activityFeedRouter: import("express").Router = Router();

activityFeedRouter.use(requireAuth);

activityFeedRouter.get(
  "/",
  validateQuery(listActivityFeedQuerySchema),
  asyncHandler(getActivityFeedController),
);
activityFeedRouter.get(
  "/entity/:entityType/:entityId",
  validateParams(activityFeedEntityParamsSchema),
  validateQuery(activityFeedEntityTimelineQuerySchema),
  asyncHandler(getEntityTimelineController),
);
activityFeedRouter.get("/health", asyncHandler(getHealthScoreController));
activityFeedRouter.get(
  "/health/project/:projectId",
  validateParams(activityFeedProjectHealthParamsSchema),
  asyncHandler(getProjectHealthController),
);

export default activityFeedRouter;
