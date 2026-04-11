import type { Request, Response } from "express";
import { integrationService } from "../services/integration";

export async function listIntegrationsController(
  request: Request,
  response: Response,
) {
  const data = await integrationService.list(request);
  response.json({ data });
}

export async function createIntegrationController(
  request: Request,
  response: Response,
) {
  const data = await integrationService.create(request);
  response.status(201).json({ data });
}

export async function getIntegrationController(
  request: Request,
  response: Response,
) {
  const data = await integrationService.get(request);
  response.json({ data });
}

export async function updateIntegrationController(
  request: Request,
  response: Response,
) {
  const data = await integrationService.update(request);
  response.json({ data });
}

export async function disconnectIntegrationController(
  request: Request,
  response: Response,
) {
  const data = await integrationService.disconnect(request);
  response.json({ data });
}
