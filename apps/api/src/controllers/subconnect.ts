import type { Request, Response } from "express";
import { subconnectService } from "../services/subconnect";

export async function listSubconnectInvitationsController(
  request: Request,
  response: Response,
) {
  const data = await subconnectService.listInvitations(request);
  response.json({ data });
}

export async function upsertPrequalificationScoreController(
  request: Request,
  response: Response,
) {
  const data = await subconnectService.upsertPrequalificationScore(request);
  response.status(201).json({ data });
}

export async function getLatestPrequalificationScoreController(
  request: Request,
  response: Response,
) {
  const data = await subconnectService.getLatestPrequalificationScore(request);
  response.json({ data });
}

export async function listComplianceTemplatesController(
  request: Request,
  response: Response,
) {
  const data = await subconnectService.listComplianceTemplates(request);
  response.json({ data });
}

export async function createComplianceTemplateController(
  request: Request,
  response: Response,
) {
  const data = await subconnectService.createComplianceTemplate(request);
  response.status(201).json({ data });
}

export async function updateComplianceTemplateController(
  request: Request,
  response: Response,
) {
  const data = await subconnectService.updateComplianceTemplate(request);
  response.json({ data });
}

export async function archiveComplianceTemplateController(
  request: Request,
  response: Response,
) {
  const data = await subconnectService.archiveComplianceTemplate(request);
  response.json({ data });
}

export async function applyComplianceTemplatesController(
  request: Request,
  response: Response,
) {
  const data = await subconnectService.applyComplianceTemplates(request);
  response.json({ data });
}

export async function listInternalPayApplicationsController(
  request: Request,
  response: Response,
) {
  const data = await subconnectService.listPayApplications(request);
  response.json({ data });
}

export async function getInternalPayApplicationController(
  request: Request,
  response: Response,
) {
  const data = await subconnectService.getPayApplication(request);
  response.json({ data });
}

export async function reviewInternalPayApplicationController(
  request: Request,
  response: Response,
) {
  const data = await subconnectService.reviewPayApplication(request);
  response.json({ data });
}

export async function listInternalDailyLogsController(
  request: Request,
  response: Response,
) {
  const data = await subconnectService.listDailyLogs(request);
  response.json({ data });
}

export async function getInternalDailyLogController(
  request: Request,
  response: Response,
) {
  const data = await subconnectService.getDailyLog(request);
  response.json({ data });
}

export async function reviewInternalDailyLogController(
  request: Request,
  response: Response,
) {
  const data = await subconnectService.reviewDailyLog(request);
  response.json({ data });
}
