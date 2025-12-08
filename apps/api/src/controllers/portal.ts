import type { Request, Response } from "express";
import { portalAuthService } from "../services/portal-auth";
import {
  portalRegisterSchema,
  portalLoginSchema,
  portalComplianceUploadSchema,
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

export async function portalGetComplianceController(request: Request, response: Response) {
  const session = (request as any).portalSession;
  const items = await portalAuthService.getUserCompliance(session.subcontractorId);

  response.json({ items });
}

export async function portalUpdateComplianceController(request: Request, response: Response) {
  const session = (request as any).portalSession;
  const body = portalComplianceUploadSchema.parse(readValidatedBody(request));

  const updated = await portalAuthService.updateComplianceEvidence(
    session.subcontractorId,
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
