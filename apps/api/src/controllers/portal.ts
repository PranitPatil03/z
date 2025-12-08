import type { Request, Response } from "express";
import { portalAuthService } from "../services/portal-auth";
import {
  dailyLogIdParamsSchema,
  payApplicationIdParamsSchema,
  portalAcceptInvitationSchema,
  portalRegisterSchema,
  portalLoginSchema,
  portalComplianceUploadSchema,
  portalCreateDailyLogSchema,
  portalCreatePayApplicationSchema,
  portalListDailyLogsQuerySchema,
  portalListPayApplicationsQuerySchema,
  portalPasswordResetConfirmSchema,
  portalPasswordResetRequestSchema,
} from "../schemas/portal.schema";
import type { ValidatedRequest } from "../lib/validate";

function readValidatedBody<T>(request: Request) {
  return (request as ValidatedRequest).validated?.body as T;
}

export async function portalRegisterController(request: Request, response: Response) {
  const body = portalRegisterSchema.parse(readValidatedBody(request));

  const result = await portalAuthService.register(
    body.email,
    body.password,
    body.name,
    body.trade,
    body.phone ?? null,
    body.projectCode,
  );

  response.status(201).json(result);
}

export async function portalLoginController(request: Request, response: Response) {
  const body = portalLoginSchema.parse(readValidatedBody(request));

  const result = await portalAuthService.login(body.email, body.password);

  response.json(result);
}

export async function portalAcceptInvitationController(request: Request, response: Response) {
  const body = portalAcceptInvitationSchema.parse(readValidatedBody(request));

  const result = await portalAuthService.acceptInvitation(body.token, body.password, body.name, body.phone);
  response.json(result);
}

export async function portalPasswordResetRequestController(request: Request, response: Response) {
  const body = portalPasswordResetRequestSchema.parse(readValidatedBody(request));

  const result = await portalAuthService.requestPasswordReset(body.email);
  response.json(result);
}

export async function portalPasswordResetConfirmController(request: Request, response: Response) {
  const body = portalPasswordResetConfirmSchema.parse(readValidatedBody(request));

  const result = await portalAuthService.confirmPasswordReset(body.token, body.password);
  response.json(result);
}

export async function portalGetComplianceController(request: Request, response: Response) {
  const session = (request as any).portalSession;
  const items = await portalAuthService.getUserCompliance(session.subcontractorId, session.organizationId);

  response.json({ items });
}

export async function portalUpdateComplianceController(request: Request, response: Response) {
  const session = (request as any).portalSession;
  const body = portalComplianceUploadSchema.parse(readValidatedBody(request));

  const updated = await portalAuthService.updateComplianceEvidence(
    session.subcontractorId,
    session.organizationId,
    body.complianceItemId,
    body.evidence ?? null,
    body.notes ?? null,
  );

  response.json({ compliance: updated });
}

export async function portalGetProfileController(request: Request, response: Response) {
  const session = (request as any).portalSession;
  response.json({ profile: session });
}

export async function portalGetOverviewController(request: Request, response: Response) {
  const session = (request as any).portalSession;
  const overview = await portalAuthService.getPortalOverview(session.subcontractorId, session.organizationId);

  response.json({ data: overview });
}

export async function portalListPayApplicationsController(request: Request, response: Response) {
  const session = (request as any).portalSession;
  const query = portalListPayApplicationsQuerySchema.parse((request as ValidatedRequest).validated?.query ?? {});
  const data = await portalAuthService.listPortalPayApplications(session.subcontractorId, session.organizationId, query);

  response.json({ data });
}

export async function portalCreatePayApplicationController(request: Request, response: Response) {
  const session = (request as any).portalSession;
  const body = portalCreatePayApplicationSchema.parse(readValidatedBody(request));
  const data = await portalAuthService.submitPortalPayApplication(session.subcontractorId, session.organizationId, body);

  response.status(201).json({ data });
}

export async function portalGetPayApplicationController(request: Request, response: Response) {
  const session = (request as any).portalSession;
  const params = payApplicationIdParamsSchema.parse((request as ValidatedRequest).validated?.params ?? {});
  const data = await portalAuthService.getPortalPayApplication(
    session.subcontractorId,
    session.organizationId,
    params.payApplicationId,
  );

  response.json({ data });
}

export async function portalListDailyLogsController(request: Request, response: Response) {
  const session = (request as any).portalSession;
  const query = portalListDailyLogsQuerySchema.parse((request as ValidatedRequest).validated?.query ?? {});
  const data = await portalAuthService.listPortalDailyLogs(session.subcontractorId, session.organizationId, query);

  response.json({ data });
}

export async function portalCreateDailyLogController(request: Request, response: Response) {
  const session = (request as any).portalSession;
  const body = portalCreateDailyLogSchema.parse(readValidatedBody(request));
  const data = await portalAuthService.submitPortalDailyLog(session.subcontractorId, session.organizationId, body);

  response.status(201).json({ data });
}

export async function portalGetDailyLogController(request: Request, response: Response) {
  const session = (request as any).portalSession;
  const params = dailyLogIdParamsSchema.parse((request as ValidatedRequest).validated?.params ?? {});
  const data = await portalAuthService.getPortalDailyLog(session.subcontractorId, session.organizationId, params.dailyLogId);

  response.json({ data });
}
