import { z } from "zod";

export const aiGenerateSchema = z.object({
  provider: z
    .enum(["openai", "anthropic", "gemini", "azure-openai"])
    .optional(),
  model: z.string().min(1),
  prompt: z.string().min(3),
  mode: z.enum(["sync", "async"]).default("sync"),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const aiJobParamsSchema = z.object({
  jobId: z.string().min(1),
});

export const aiEstimateSchema = z.object({
  projectName: z.string().min(1),
  scope: z.string().min(3),
  budgetCents: z.number().int().nonnegative().optional(),
  constraints: z.array(z.string()).default([]),
});
