import { z } from "zod";
import { paginationQuerySchema } from "../lib/pagination";

export const invoiceIdParamsSchema = z.object({
  invoiceId: z.string().min(1),
});

export const listInvoicesQuerySchema = paginationQuerySchema.extend({
  projectId: z.string().min(1).optional(),
  status: z.enum(["draft", "submitted", "approved", "rejected", "paid", "hold"]).optional(),
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
  allowPayOverride: z.boolean().optional(),
  payOverrideReason: z.string().min(8).max(1000).optional(),
}).superRefine((value, context) => {
  if (value.allowPayOverride === true && !value.payOverrideReason) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "payOverrideReason is required when allowPayOverride is true",
      path: ["payOverrideReason"],
    });
  }
});
