import { Router } from "express";
import { createAuditLogController, getAuditLogController, listAuditLogsController } from "../controllers/audit-log";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams, validateQuery } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import { auditLogIdParamsSchema, createAuditLogSchema, listAuditLogsQuerySchema } from "../schemas/audit-log.schema";

export const auditLogRouter = Router();

auditLogRouter.use(requireAuth);

auditLogRouter.get("/", validateQuery(listAuditLogsQuerySchema), asyncHandler(listAuditLogsController));
auditLogRouter.post("/", validateBody(createAuditLogSchema), asyncHandler(createAuditLogController));
auditLogRouter.get("/:auditLogId", validateParams(auditLogIdParamsSchema), asyncHandler(getAuditLogController));
