import { z } from "zod";

export const subconnectInvitationStatusSchema = z.enum([
  "pending",
  "accepted",
  "expired",
  "revoked",
]);

export const listSubconnectInvitationsQuerySchema = z.object({
  projectId: z.string().min(1).optional(),
  subcontractorId: z.string().min(1).optional(),
  status: subconnectInvitationStatusSchema.optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const upsertPrequalificationScoreSchema = z.object({
  subcontractorId: z.string().min(1),
  projectId: z.string().min(1).optional(),
  overallScoreBps: z.number().int().min(0).max(10000),
  safetyScoreBps: z.number().int().min(0).max(10000).optional(),
  financialScoreBps: z.number().int().min(0).max(10000).optional(),
  complianceScoreBps: z.number().int().min(0).max(10000).optional(),
  capacityScoreBps: z.number().int().min(0).max(10000).optional(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
  modelVersion: z.string().min(1).max(50).optional(),
  notes: z.string().max(4000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const subcontractorIdParamsSchema = z.object({
  subcontractorId: z.string().min(1),
});

export const listInternalPayApplicationsQuerySchema = z.object({
  projectId: z.string().min(1).optional(),
  subcontractorId: z.string().min(1).optional(),
  status: z
    .enum([
      "draft",
      "submitted",
      "under_review",
      "approved",
      "rejected",
      "paid",
    ])
    .optional(),
  limit: z.number().int().min(1).max(200).default(100),
});

export const payApplicationIdParamsSchema = z.object({
  payApplicationId: z.string().min(1),
});

export const reviewPayApplicationSchema = z.object({
  status: z.enum(["under_review", "approved", "rejected", "paid"]),
  reason: z.string().max(4000).optional(),
  reviewerNotes: z.string().max(4000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const listInternalDailyLogsQuerySchema = z.object({
  projectId: z.string().min(1).optional(),
  subcontractorId: z.string().min(1).optional(),
  reviewStatus: z.enum(["pending", "reviewed", "rejected"]).optional(),
  limit: z.number().int().min(1).max(200).default(100),
});

export const dailyLogIdParamsSchema = z.object({
  dailyLogId: z.string().min(1),
});

export const reviewDailyLogSchema = z.object({
  reviewStatus: z.enum(["reviewed", "rejected"]),
  reviewNotes: z.string().max(4000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
