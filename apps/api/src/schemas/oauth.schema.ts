import { z } from "zod";

export const connectOAuthAccountSchema = z.object({
  provider: z.enum(["gmail", "outlook"]),
  code: z.string().min(1),
  redirectUri: z.string().url(),
});

export const oauthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  provider: z.enum(["gmail", "outlook"]),
});

export const oauthStateSchema = z.object({
  organizationId: z.string().min(1),
  userId: z.string().min(1),
  provider: z.enum(["gmail", "outlook"]),
  redirectUri: z.string().url(),
  timestamp: z.number(),
});

export const disconnectOAuthAccountSchema = z.object({
  accountId: z.string().min(1),
});

export const syncEmailsSchema = z.object({
  accountId: z.string().min(1),
  maxResults: z.number().int().min(1).max(100).default(50),
});

export const oauthErrorSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
  state: z.string().optional(),
});
