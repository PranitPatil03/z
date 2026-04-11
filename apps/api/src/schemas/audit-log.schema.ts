import { z } from "zod";
import { paginationQuerySchema } from "../lib/pagination";

export const auditLogIdParamsSchema = z.object({
  auditLogId: z.string().min(1),
});

export const listAuditLogsQuerySchema = paginationQuerySchema.extend({
  entityType: z.string().min(1).optional(),
  entityId: z.string().min(1).optional(),
  actorUserId: z.string().min(1).optional(),
  action: z
    .enum([
      "create",
      "update",
      "delete",
      "approve",
      "reject",
      "invite",
      "archive",
      "login",
    ])
    .optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const createAuditLogSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  action: z.enum([
    "create",
    "update",
    "delete",
    "approve",
    "reject",
    "invite",
    "archive",
    "login",
  ]),
  beforeData: z.record(z.string(), z.unknown()).optional(),
  afterData: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
