import { z } from "zod";

export const projectIdParamsSchema = z.object({
  projectId: z.string().min(1),
});

export const createProjectSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).regex(/^[A-Z0-9-]+$/),
  description: z.string().max(2000).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).regex(/^[A-Z0-9-]+$/).optional(),
  description: z.string().max(2000).optional(),
});
