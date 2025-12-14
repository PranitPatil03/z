import type { Request, Response } from "express";
import { billingService } from "../services/billing";

export async function listBillingRecordsController(
  request: Request,
  response: Response,
) {
  const data = await billingService.list(request);
  response.json({ data });
}

export async function createBillingRecordController(
  request: Request,
  response: Response,
) {
  const data = await billingService.create(request);
  response.status(201).json({ data });
}

export async function getBillingRecordController(
  request: Request,
  response: Response,
) {
  const data = await billingService.get(request);
  response.json({ data });
}

export async function updateBillingRecordController(
  request: Request,
  response: Response,
) {
  const data = await billingService.update(request);
  response.json({ data });
}

export async function archiveBillingRecordController(
  request: Request,
  response: Response,
) {
  const data = await billingService.archive(request);
  response.json({ data });
}

export async function getUsageSummaryController(
  request: Request,
  response: Response,
) {
  const data = await billingService.usage(request);
  response.json({ data });
}

export async function listSubscriptionPlansController(
  _request: Request,
  response: Response,
) {
  const data = await billingService.plans();
  response.json({ data });
}

export async function updateSubscriptionPlanController(
  request: Request,
  response: Response,
) {
  const data = await billingService.changePlan(request);
  response.json({ data });
}
