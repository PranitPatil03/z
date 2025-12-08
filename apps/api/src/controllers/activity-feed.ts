import type { Request, Response } from "express";
import { activityFeedService } from "../services/activity-feed";

export async function getActivityFeedController(request: Request, response: Response) {
  const { pageSize } = request.query as { pageSize?: string };
  const activities = await activityFeedService.getActivityFeed(request, parseInt(pageSize || "50", 10));
  response.json({ activities });
}

export async function getHealthScoreController(request: Request, response: Response) {
  const health = await activityFeedService.getHealthScore(request);
  response.json(health);
}

export async function getProjectHealthController(request: Request, response: Response) {
  const { projectId } = request.params as { projectId: string };
  const health = await activityFeedService.getProjectHealth(request, projectId);
  response.json(health);
}
