import { z } from "zod";

export const budgetCostCodeIdParamsSchema = z.object({
  costCodeId: z.string().min(1),
});

export const listBudgetQuerySchema = z.object({
  projectId: z.string().min(1),
});

export const budgetProjectSettingsQuerySchema = z.object({
  projectId: z.string().min(1),
});

export const upsertBudgetProjectSettingsSchema = z.object({
  projectId: z.string().min(1),
  alertThresholdBps: z.number().int().min(0).max(10000),
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
}).superRefine((value, context) => {
  if (
    value.name === undefined &&
    value.budgetCents === undefined &&
    value.committedCents === undefined &&
    value.actualCents === undefined &&
    value.billedCents === undefined &&
    value.alertThresholdBps === undefined
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one field must be provided",
    });
  }
});

export const budgetCostEntryTypeSchema = z.enum(["committed", "actual", "billed"]);
export const budgetCostEntrySourceTypeSchema = z.enum([
  "change_order",
  "purchase_order",
  "invoice",
  "payment_application",
  "manual",
  "other",
]);

export const budgetCostCodeEntryParamsSchema = z.object({
  costCodeId: z.string().min(1),
});

export const createBudgetCostEntrySchema = z
  .object({
    projectId: z.string().min(1),
    entryType: budgetCostEntryTypeSchema,
    sourceType: budgetCostEntrySourceTypeSchema,
    sourceId: z.string().min(1).optional(),
    sourceRef: z.string().min(1).max(128).optional(),
    amountCents: z.number().int(),
    occurredAt: z.string().datetime().optional(),
    notes: z.string().min(2).max(2000).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, context) => {
    if (value.amountCents === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "amountCents cannot be zero",
        path: ["amountCents"],
      });
    }

    if (["change_order", "purchase_order", "invoice"].includes(value.sourceType) && !value.sourceId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sourceId is required for linked system sources",
        path: ["sourceId"],
      });
    }

    if (value.sourceType === "payment_application" && !value.sourceId && !value.sourceRef) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "payment_application entries require sourceId or sourceRef",
        path: ["sourceId"],
      });
    }
  });

export const listBudgetCostEntriesQuerySchema = z.object({
  projectId: z.string().min(1),
  entryType: budgetCostEntryTypeSchema.optional(),
  sourceType: budgetCostEntrySourceTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const budgetCostCodeDrilldownQuerySchema = z.object({
  projectId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const queueNarrativesSchema = z.object({
  projectId: z.string().min(1),
});

export const deduplicateAlertsSchema = z.object({
  projectId: z.string().min(1),
  maxAgeHours: z.number().int().min(1).max(720).default(24),
});
