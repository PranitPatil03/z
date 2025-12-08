import type { Request, Response } from "express";
import { auditLogService } from "../services/audit-log";

export async function listAuditLogsController(request: Request, response: Response) {
  const data = await auditLogService.list(request);
  response.json({ data });
}

export async function createAuditLogController(request: Request, response: Response) {
  const data = await auditLogService.create(request);
  response.status(201).json({ data });
}

export async function getAuditLogController(request: Request, response: Response) {
  const data = await auditLogService.get(request);
  response.json({ data });
}
