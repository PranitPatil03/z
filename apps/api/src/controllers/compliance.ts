import type { Request, Response } from "express";
import { complianceService } from "../services/compliance";

export async function listComplianceItemsController(
  request: Request,
  response: Response,
) {
  const data = await complianceService.list(request);
  response.json({ data });
}

export async function createComplianceItemController(
  request: Request,
  response: Response,
) {
  const data = await complianceService.create(request);
  response.status(201).json({ data });
}

export async function getComplianceItemController(
  request: Request,
  response: Response,
) {
  const data = await complianceService.get(request);
  response.json({ data });
}

export async function updateComplianceItemController(
  request: Request,
  response: Response,
) {
  const data = await complianceService.update(request);
  response.json({ data });
}

export async function archiveComplianceItemController(
  request: Request,
  response: Response,
) {
  const data = await complianceService.archive(request);
  response.json({ data });
}

export async function queueComplianceInsuranceExtractionController(
  request: Request,
  response: Response,
) {
  const data = await complianceService.queueInsuranceExtraction(request);
  response.json({ data });
}
