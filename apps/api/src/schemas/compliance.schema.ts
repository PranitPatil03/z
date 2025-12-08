import { z } from "zod";

export const complianceItemIdParamsSchema = z.object({
  complianceItemId: z.string().min(1),
});

export const createComplianceItemSchema = z.object({
  projectId: z.string().min(1),
  subcontractorId: z.string().min(1).optional(),
  complianceType: z.string().min(2),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(4000).optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
});

export const updateComplianceItemSchema = z.object({
  subcontractorId: z.string().min(1).optional(),
  complianceType: z.string().min(2).optional(),
  status: z.enum(["pending", "compliant", "non_compliant", "expired"]).optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(4000).optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
});
