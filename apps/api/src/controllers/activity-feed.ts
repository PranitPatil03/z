import type { Request, Response } from "express";
import type { ValidatedRequest } from "../lib/validate";
import { activityFeedService } from "../services/activity-feed";

function readValidatedParams<T>(request: Request) {
  return (request as ValidatedRequest).validated?.params as T;
}

export async function getActivityFeedController(
  request: Request,
  response: Response,
) {
  const data = await activityFeedService.getActivityFeed(request);
  response.json({ data });
}

export async function getHealthScoreController(
  request: Request,
  response: Response,
) {
  const data = await activityFeedService.getHealthScore(request);
  response.json({ data });
}

export async function getEntityTimelineController(
  request: Request,
  response: Response,
) {
  const { entityType, entityId } = readValidatedParams<{
    entityType: string;
    entityId: string;
  }>(request);
  const data = await activityFeedService.getEntityTimeline(
    request,
    entityType,
    entityId,
  );
  response.json({ data });
}

export async function getProjectHealthController(
  request: Request,
  response: Response,
) {
  const { projectId } = readValidatedParams<{ projectId: string }>(request);
  const data = await activityFeedService.getProjectHealth(request, projectId);
  response.json({ data });
}
