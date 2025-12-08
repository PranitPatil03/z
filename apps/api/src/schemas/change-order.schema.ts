import { z } from "zod";

const changeOrderStatusSchema = z.enum([
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "closed",
  "revision_requested",
]);

export const changeOrderIdParamsSchema = z.object({
  changeOrderId: z.string().min(1),
});

export const listChangeOrdersQuerySchema = z.object({
  projectId: z.string().min(1),
});

export const createChangeOrderSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(2),
  reason: z.string().min(2),
  impactCostCents: z.number().int().min(0).default(0),
  impactDays: z.number().int().min(0).default(0),
  deadlineAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateChangeOrderSchema = z.object({
  title: z.string().min(2).optional(),
  reason: z.string().min(2).optional(),
  impactCostCents: z.number().int().min(0).optional(),
  impactDays: z.number().int().min(0).optional(),
  status: changeOrderStatusSchema.optional(),
  pipelineStage: z.string().min(1).optional(),
  deadlineAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const decisionChangeOrderSchema = z.object({
  status: z.enum(["approved", "rejected", "closed"]),
});
