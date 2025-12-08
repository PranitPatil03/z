import { z } from "zod";

export const portalRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phone: z.string().optional(),
  trade: z.string().min(1),
  projectCode: z.string().min(1),
});

export const portalLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const portalComplianceUpdateSchema = z.object({
  status: z.enum(["pending", "verified", "expiring", "expired", "non_compliant", "compliant"]).optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().optional(),
});

export const portalComplianceUploadSchema = z.object({
  complianceItemId: z.string().min(1),
  evidence: z
    .string()
    .optional()
    .describe("Base64-encoded file content or file URL"),
  notes: z.string().optional(),
});

export const complianceItemIdParamsSchema = z.object({
  complianceItemId: z.string().min(1),
});

export const portalAcceptInvitationSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(200).optional(),
  phone: z.string().min(5).max(64).optional(),
});

export const portalPasswordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const portalPasswordResetConfirmSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8).max(128),
});

export const payApplicationIdParamsSchema = z.object({
  payApplicationId: z.string().min(1),
});

export const dailyLogIdParamsSchema = z.object({
  dailyLogId: z.string().min(1),
});

export const portalPayApplicationLineItemSchema = z.object({
  description: z.string().min(1).max(500),
  costCode: z.string().max(100).optional(),
  quantityUnits: z.number().int().min(1).max(1_000_000).optional(),
  unitAmountCents: z.number().int().min(0).optional(),
  amountCents: z.number().int().min(0),
  evidence: z.record(z.string(), z.unknown()).optional(),
});

export const portalCreatePayApplicationSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  summary: z.string().max(4000).optional(),
  currency: z.string().min(3).max(3).optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
  lineItems: z.array(portalPayApplicationLineItemSchema).min(1).max(500),
});

export const portalListPayApplicationsQuerySchema = z.object({
  status: z.enum(["draft", "submitted", "under_review", "approved", "rejected", "paid"]).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const portalCreateDailyLogSchema = z.object({
  logDate: z.string().datetime(),
  laborCount: z.number().int().min(0).max(100000),
  equipmentUsed: z.array(z.string().min(1).max(255)).max(200).optional(),
  performedWork: z.string().min(3).max(20000),
  attachments: z.array(z.string().min(1)).max(200).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const portalListDailyLogsQuerySchema = z.object({
  reviewStatus: z.enum(["pending", "reviewed", "rejected"]).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});
