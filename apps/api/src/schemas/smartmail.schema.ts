import { z } from "zod";

export const smartMailAccountIdParamsSchema = z.object({
  accountId: z.string().min(1),
});

export const smartMailThreadIdParamsSchema = z.object({
  threadId: z.string().min(1),
});

export const listSmartMailThreadsQuerySchema = z.object({
  projectId: z.string().min(1),
});

export const createSmartMailAccountSchema = z.object({
  provider: z.string().min(1),
  email: z.string().email(),
  accessToken: z.string().min(1).optional(),
  refreshToken: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateSmartMailAccountSchema = z.object({
  status: z.enum(["connected", "disconnected", "error"]).optional(),
  accessToken: z.string().min(1).optional(),
  refreshToken: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createSmartMailThreadSchema = z.object({
  projectId: z.string().min(1),
  subject: z.string().min(1),
  externalThreadId: z.string().min(1).optional(),
});

export const createSmartMailMessageSchema = z.object({
  projectId: z.string().min(1),
  fromEmail: z.string().email(),
  toEmail: z.string().email(),
  body: z.string().min(1),
  linkedEntityType: z.string().min(1).optional(),
  linkedEntityId: z.string().min(1).optional(),
  aiDraft: z.boolean().default(false),
  sentAt: z.string().datetime().optional(),
});
