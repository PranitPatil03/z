import { z } from "zod";

export const smartMailAccountIdParamsSchema = z.object({
  accountId: z.string().min(1),
});

export const smartMailThreadIdParamsSchema = z.object({
  threadId: z.string().min(1),
});

export const smartMailMessageIdParamsSchema = z.object({
  messageId: z.string().min(1),
});

export const smartMailTemplateIdParamsSchema = z.object({
  templateId: z.string().min(1),
});

export const listSmartMailThreadsQuerySchema = z.object({
  projectId: z.string().min(1),
  accountId: z.string().min(1).optional(),
});

export const listSmartMailTemplatesQuerySchema = z.object({
  projectId: z.string().min(1).optional(),
  type: z.enum(["template", "snippet"]).optional(),
});

export const createSmartMailAccountSchema = z.object({
  provider: z.enum(["gmail", "outlook"]),
  email: z.string().email(),
  accessToken: z.string().min(1).optional(),
  refreshToken: z.string().min(1).optional(),
  tokenExpiresAt: z.string().datetime().optional(),
  autoSyncEnabled: z.boolean().optional(),
  defaultProjectId: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateSmartMailAccountSchema = z.object({
  status: z.enum(["connected", "disconnected", "error"]).optional(),
  accessToken: z.string().min(1).optional(),
  refreshToken: z.string().min(1).optional(),
  tokenExpiresAt: z.string().datetime().optional(),
  autoSyncEnabled: z.boolean().optional(),
  defaultProjectId: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const syncSmartMailAccountSchema = z.object({
  projectId: z.string().min(1).optional(),
  maxResults: z.number().int().min(1).max(100).default(50),
});

export const createSmartMailThreadSchema = z.object({
  projectId: z.string().min(1),
  accountId: z.string().min(1),
  subject: z.string().min(1),
  externalThreadId: z.string().min(1).optional(),
  linkedEntityType: z
    .enum(["purchase_order", "invoice", "change_order", "subcontractor"])
    .optional(),
  linkedEntityId: z.string().min(1).optional(),
});

export const createSmartMailMessageSchema = z.object({
  projectId: z.string().min(1),
  accountId: z.string().min(1),
  toEmails: z.array(z.string().email()).min(1),
  ccEmails: z.array(z.string().email()).default([]),
  subject: z.string().min(1).optional(),
  body: z.string().min(1),
  linkedEntityType: z
    .enum(["purchase_order", "invoice", "change_order", "subcontractor"])
    .optional(),
  linkedEntityId: z.string().min(1).optional(),
  aiDraft: z.boolean().default(false),
  sendNow: z.boolean().default(true),
  inReplyToMessageId: z.string().min(1).optional(),
  sentAt: z.string().datetime().optional(),
});

export const createSmartMailDraftSchema = z.object({
  projectId: z.string().min(1),
  accountId: z.string().min(1),
  prompt: z.string().min(10),
  tone: z.string().min(1).optional(),
  provider: z
    .enum(["openai", "anthropic", "gemini", "azure-openai"])
    .optional(),
  model: z.string().min(1).optional(),
  templateId: z.string().min(1).optional(),
  linkedEntityType: z
    .enum(["purchase_order", "invoice", "change_order", "subcontractor"])
    .optional(),
  linkedEntityId: z.string().min(1).optional(),
});

export const updateSmartMailMessageLinkSchema = z.object({
  linkedEntityType: z
    .enum(["purchase_order", "invoice", "change_order", "subcontractor"])
    .optional(),
  linkedEntityId: z.string().min(1).optional(),
  clear: z.boolean().default(false),
});

export const createSmartMailTemplateSchema = z.object({
  projectId: z.string().min(1).optional(),
  name: z.string().min(2),
  type: z.enum(["template", "snippet"]).default("template"),
  subjectTemplate: z.string().default(""),
  bodyTemplate: z.string().min(1),
  variables: z.array(z.string().min(1)).default([]),
  isShared: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateSmartMailTemplateSchema = z.object({
  name: z.string().min(2).optional(),
  subjectTemplate: z.string().optional(),
  bodyTemplate: z.string().min(1).optional(),
  variables: z.array(z.string().min(1)).optional(),
  isShared: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
