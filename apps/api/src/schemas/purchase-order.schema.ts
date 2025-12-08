import { z } from "zod";

export const purchaseOrderIdParamsSchema = z.object({
  purchaseOrderId: z.string().min(1),
});

export const createPurchaseOrderSchema = z.object({
  projectId: z.string().min(1),
  rfqId: z.string().min(1).optional(),
  poNumber: z.string().min(1),
  vendorName: z.string().min(2),
  currency: z.string().length(3).default("USD"),
  totalAmountCents: z.number().int().nonnegative(),
  issueDate: z.string().datetime().optional(),
});

export const updatePurchaseOrderSchema = z.object({
  vendorName: z.string().min(2).optional(),
  currency: z.string().length(3).optional(),
  totalAmountCents: z.number().int().nonnegative().optional(),
  status: z.enum(["draft", "issued", "approved", "closed", "canceled"]).optional(),
  issueDate: z.string().datetime().optional(),
});
