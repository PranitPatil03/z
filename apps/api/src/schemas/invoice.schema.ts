import { z } from "zod";

export const invoiceIdParamsSchema = z.object({
  invoiceId: z.string().min(1),
});

export const createInvoiceSchema = z.object({
  projectId: z.string().min(1),
  purchaseOrderId: z.string().min(1).optional(),
  invoiceNumber: z.string().min(1),
  vendorName: z.string().min(2),
  currency: z.string().length(3).default("USD"),
  totalAmountCents: z.number().int().nonnegative(),
  dueDate: z.string().datetime().optional(),
});

export const updateInvoiceSchema = z.object({
  vendorName: z.string().min(2).optional(),
  currency: z.string().length(3).optional(),
  totalAmountCents: z.number().int().nonnegative().optional(),
  status: z.enum(["draft", "submitted", "approved", "rejected", "paid", "hold"]).optional(),
  dueDate: z.string().datetime().optional(),
});
