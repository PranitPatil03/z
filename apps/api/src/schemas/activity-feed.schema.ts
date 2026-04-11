import { z } from "zod";

export const listActivityFeedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  entityType: z.string().min(1).optional(),
  actorUserId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  action: z
    .enum([
      "create",
      "update",
      "delete",
      "approve",
      "reject",
      "invite",
      "archive",
      "login",
    ])
    .optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const activityFeedEntityTimelineQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  action: z
    .enum([
      "create",
      "update",
      "delete",
      "approve",
      "reject",
      "invite",
      "archive",
      "login",
    ])
    .optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const activityFeedEntityParamsSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
});

export const activityFeedProjectHealthParamsSchema = z.object({
  projectId: z.string().min(1),
});
