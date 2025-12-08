import { z } from "zod";

export const budgetCostCodeIdParamsSchema = z.object({
  costCodeId: z.string().min(1),
});

export const listBudgetQuerySchema = z.object({
  projectId: z.string().min(1),
});

export const createBudgetCostCodeSchema = z.object({
  projectId: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(2),
  budgetCents: z.number().int().min(0),
  alertThresholdBps: z.number().int().min(0).max(10000).default(500),
});

export const updateBudgetCostCodeSchema = z.object({
  name: z.string().min(2).optional(),
  budgetCents: z.number().int().min(0).optional(),
  committedCents: z.number().int().min(0).optional(),
  actualCents: z.number().int().min(0).optional(),
  billedCents: z.number().int().min(0).optional(),
  alertThresholdBps: z.number().int().min(0).max(10000).optional(),
});

export const queueNarrativesSchema = z.object({
  projectId: z.string().min(1),
});

export const deduplicateAlertsSchema = z.object({
  projectId: z.string().min(1),
  maxAgeHours: z.number().int().min(1).max(720).default(24),
});
