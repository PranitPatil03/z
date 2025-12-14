import { z } from "zod";

export const subcontractorIdParamsSchema = z.object({
  subcontractorId: z.string().min(1),
});

export const createSubcontractorSchema = z.object({
  projectId: z.string().min(1).optional(),
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(5).optional(),
  trade: z.string().min(2),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const listSubcontractorsQuerySchema = z.object({
  projectId: z.string().min(1).optional(),
  status: z.enum(["active", "inactive", "blocked"]).optional(),
  trade: z.string().min(1).optional(),
  portalEnabled: z
    .union([
      z.boolean(),
      z.string().transform((value) => value.toLowerCase() === "true"),
    ])
    .optional(),
  includeComplianceSummary: z
    .union([
      z.boolean(),
      z.string().transform((value) => value.toLowerCase() === "true"),
    ])
    .optional(),
});

export const updateSubcontractorSchema = z.object({
  projectId: z.string().min(1).optional(),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(5).optional(),
  trade: z.string().min(2).optional(),
  status: z.enum(["active", "inactive", "blocked"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const inviteSubcontractorPortalSchema = z.object({
  email: z.string().email().optional(),
  projectId: z.string().min(1).optional(),
  temporaryPassword: z.string().min(8).max(128).optional(),
  assignedScope: z.string().max(4000).optional(),
  milestones: z.array(z.string().min(1)).max(50).optional(),
  sendInviteEmail: z
    .union([
      z.boolean(),
      z.string().transform((value) => value.toLowerCase() === "true"),
    ])
    .optional(),
});
