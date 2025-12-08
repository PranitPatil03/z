import { z } from "zod";

export const portalRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phone: z.string().optional(),
  trade: z.string().min(1),
  projectCode: z.string().min(1),
});

export const portalLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const portalComplianceUpdateSchema = z.object({
  status: z.enum(["pending", "submitted", "approved", "rejected"]).optional(),
  evidence: z.string().optional(),
  notes: z.string().optional(),
});

export const portalComplianceUploadSchema = z.object({
  complianceItemId: z.string().min(1),
  evidence: z
    .string()
    .optional()
    .describe("Base64-encoded file content or file URL"),
  notes: z.string().optional(),
});

export const complianceItemIdParamsSchema = z.object({
  complianceItemId: z.string().min(1),
});
