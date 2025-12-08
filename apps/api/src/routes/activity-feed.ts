import { Router } from "express";
import {
  getActivityFeedController,
  getHealthScoreController,
  getProjectHealthController,
} from "../controllers/activity-feed";
import { asyncHandler } from "../lib/async-handler";
import { requireAuth } from "../middleware/require-auth";

export const activityFeedRouter: import("express").Router = Router();

activityFeedRouter.use(requireAuth);

activityFeedRouter.get("/", asyncHandler(getActivityFeedController));
activityFeedRouter.get("/health", asyncHandler(getHealthScoreController));
activityFeedRouter.get("/health/project/:projectId", asyncHandler(getProjectHealthController));

export default activityFeedRouter;
