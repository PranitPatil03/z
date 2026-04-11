import type { Request, Response } from "express";
import { siteSnapService } from "../services/site-snap";

export async function listSiteSnapsController(
  request: Request,
  response: Response,
) {
  const data = await siteSnapService.list(request);
  response.json({ data });
}

export async function createSiteSnapController(
  request: Request,
  response: Response,
) {
  const data = await siteSnapService.create(request);
  response.status(201).json({ data });
}

export async function getSiteSnapController(
  request: Request,
  response: Response,
) {
  const data = await siteSnapService.get(request);
  response.json({ data });
}

export async function updateSiteSnapController(
  request: Request,
  response: Response,
) {
  const data = await siteSnapService.update(request);
  response.json({ data });
}

export async function analyzeSiteSnapController(
  request: Request,
  response: Response,
) {
  const data = await siteSnapService.analyze(request);
  response.json({ data });
}

export async function reanalyzeSiteSnapController(
  request: Request,
  response: Response,
) {
  const data = await siteSnapService.reanalyze(request);
  response.json({ data });
}

export async function reviewSiteSnapController(
  request: Request,
  response: Response,
) {
  const data = await siteSnapService.review(request);
  response.json({ data });
}

export async function createSiteSnapObservationController(
  request: Request,
  response: Response,
) {
  const data = await siteSnapService.createObservation(request);
  response.status(201).json({ data });
}

export async function updateSiteSnapObservationController(
  request: Request,
  response: Response,
) {
  const data = await siteSnapService.updateObservation(request);
  response.json({ data });
}

export async function deleteSiteSnapObservationController(
  request: Request,
  response: Response,
) {
  const data = await siteSnapService.deleteObservation(request);
  response.json({ data });
}

export async function getSiteSnapDailyProgressController(
  request: Request,
  response: Response,
) {
  const data = await siteSnapService.dailyProgress(request);
  response.json({ data });
}
