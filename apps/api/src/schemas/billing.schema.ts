import { z } from "zod";

export const billingRecordIdParamsSchema = z.object({
  billingRecordId: z.string().min(1),
});

export const createBillingRecordSchema = z.object({
  projectId: z.string().min(1).optional(),
  reference: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().length(3).default("USD"),
  dueDate: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateBillingRecordSchema = z.object({
  projectId: z.string().min(1).optional(),
  reference: z.string().min(1).optional(),
  amountCents: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  status: z.enum(["draft", "issued", "paid", "void"]).optional(),
  dueDate: z.string().datetime().optional(),
  paidAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
