import { z } from "zod";

export const complianceStatusSchema = z.enum([
  "pending",
  "verified",
  "expiring",
  "expired",
  "non_compliant",
  "compliant",
]);

export const complianceItemIdParamsSchema = z.object({
  complianceItemId: z.string().min(1),
});

export const complianceTemplateIdParamsSchema = z.object({
  templateId: z.string().min(1),
});

export const listComplianceItemsQuerySchema = z.object({
  projectId: z.string().min(1).optional(),
  subcontractorId: z.string().min(1).optional(),
  status: complianceStatusSchema.optional(),
  complianceType: z.string().min(1).optional(),
  highRiskOnly: z
    .union([
      z.boolean(),
      z.string().transform((value) => value.toLowerCase() === "true"),
    ])
    .optional(),
});

export const createComplianceItemSchema = z.object({
  projectId: z.string().min(1),
  subcontractorId: z.string().min(1).optional(),
  complianceType: z.string().min(2),
  highRisk: z.boolean().optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(4000).optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
});

export const updateComplianceItemSchema = z.object({
  subcontractorId: z.string().min(1).optional(),
  complianceType: z.string().min(2).optional(),
  status: complianceStatusSchema.optional(),
  highRisk: z.boolean().optional(),
  reviewerConfirmed: z.boolean().optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(4000).optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
});

export const listComplianceTemplatesQuerySchema = z.object({
  projectId: z.string().min(1),
});

export const createComplianceTemplateSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(2).max(200),
  complianceType: z.string().min(2).max(200),
  defaultDueDays: z.number().int().min(1).max(365).default(30),
  required: z.boolean().optional(),
  highRisk: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateComplianceTemplateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  complianceType: z.string().min(2).max(200).optional(),
  defaultDueDays: z.number().int().min(1).max(365).optional(),
  required: z.boolean().optional(),
  highRisk: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const applyComplianceTemplatesSchema = z.object({
  projectId: z.string().min(1),
  subcontractorId: z.string().min(1),
  dueDateOverride: z.string().datetime().optional(),
});

export const queueInsuranceExtractionSchema = z.object({
  prompt: z.string().min(10).max(10000),
  sourceFileName: z.string().max(255).optional(),
  sourceUrl: z.string().url().optional(),
  provider: z
    .enum(["openai", "anthropic", "gemini", "azure-openai"])
    .optional(),
  model: z.string().min(1).optional(),
});
