import type { Request, Response } from "express";
import { subcontractorService } from "../services/subcontractor";

export async function listSubcontractorsController(request: Request, response: Response) {
  const data = await subcontractorService.list(request);
  response.json({ data });
}

export async function createSubcontractorController(request: Request, response: Response) {
  const data = await subcontractorService.create(request);
  response.status(201).json({ data });
}

export async function getSubcontractorController(request: Request, response: Response) {
  const data = await subcontractorService.get(request);
  response.json({ data });
}

export async function updateSubcontractorController(request: Request, response: Response) {
  const data = await subcontractorService.update(request);
  response.json({ data });
}

export async function archiveSubcontractorController(request: Request, response: Response) {
  const data = await subcontractorService.archive(request);
  response.json({ data });
}
