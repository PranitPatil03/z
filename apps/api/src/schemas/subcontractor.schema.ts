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

export const updateSubcontractorSchema = z.object({
  projectId: z.string().min(1).optional(),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(5).optional(),
  trade: z.string().min(2).optional(),
  status: z.enum(["active", "inactive", "blocked"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
