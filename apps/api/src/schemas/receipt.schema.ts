import { z } from "zod";

export const receiptIdParamsSchema = z.object({
  receiptId: z.string().min(1),
});

export const createReceiptSchema = z.object({
  projectId: z.string().min(1),
  purchaseOrderId: z.string().min(1).optional(),
  receiptNumber: z.string().min(1),
  receivedAmountCents: z.number().int().nonnegative(),
  receivedAt: z.string().datetime().optional(),
  notes: z.string().max(4000).optional(),
});

export const updateReceiptSchema = z.object({
  receivedAmountCents: z.number().int().nonnegative().optional(),
  status: z.enum(["received", "verified", "rejected"]).optional(),
  receivedAt: z.string().datetime().optional(),
  notes: z.string().max(4000).optional(),
});
