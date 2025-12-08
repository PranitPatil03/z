import { z } from "zod";

export const rfqIdParamsSchema = z.object({
  rfqId: z.string().min(1),
});

export const createRfqSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(2),
  scope: z.string().min(2),
  dueDate: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateRfqSchema = z.object({
  title: z.string().min(2).optional(),
  scope: z.string().min(2).optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(["draft", "sent", "closed", "canceled"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
