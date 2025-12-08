import { z } from "zod";

export const commandCenterOverviewQuerySchema = z.object({
  projectId: z.string().min(1),
  windowDays: z.coerce.number().int().min(7).max(180).default(30),
});

export const commandCenterHealthQuerySchema = z.object({
  projectId: z.string().min(1),
  windowDays: z.coerce.number().int().min(7).max(180).default(30),
});

export const commandCenterPortfolioQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  windowDays: z.coerce.number().int().min(7).max(180).default(30),
});

export const commandCenterTrendsQuerySchema = z.object({
  projectId: z.string().min(1),
  windowDays: z.coerce.number().int().min(7).max(180).default(30),
  interval: z.enum(["day", "week"]).default("day"),
});
