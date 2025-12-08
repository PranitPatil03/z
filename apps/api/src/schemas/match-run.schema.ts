import { z } from "zod";

export const matchRunIdParamsSchema = z.object({
  matchRunId: z.string().min(1),
});

export const createMatchRunSchema = z.object({
  projectId: z.string().min(1),
  invoiceId: z.string().min(1),
  purchaseOrderId: z.string().min(1).optional(),
  receiptId: z.string().min(1).optional(),
  toleranceBps: z.number().int().min(0).max(5000).default(0),
});
