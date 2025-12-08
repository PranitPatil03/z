import { z } from "zod";

export const integrationIdParamsSchema = z.object({
  integrationId: z.string().min(1),
});

export const createIntegrationSchema = z.object({
  provider: z.string().min(2),
  name: z.string().min(2),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const updateIntegrationSchema = z.object({
  provider: z.string().min(2).optional(),
  name: z.string().min(2).optional(),
  status: z.enum(["connected", "disconnected", "error"]).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  lastSyncAt: z.string().datetime().optional(),
});
