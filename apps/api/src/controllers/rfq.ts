import type { Request, Response } from "express";
import { rfqService } from "../services/rfq";

export async function listRfqsController(request: Request, response: Response) {
  const data = await rfqService.list(request);
  response.json({ data });
}

export async function createRfqController(
  request: Request,
  response: Response,
) {
  const data = await rfqService.create(request);
  response.status(201).json({ data });
}

export async function getRfqController(request: Request, response: Response) {
  const data = await rfqService.get(request);
  response.json({ data });
}

export async function updateRfqController(
  request: Request,
  response: Response,
) {
  const data = await rfqService.update(request);
  response.json({ data });
}

export async function archiveRfqController(
  request: Request,
  response: Response,
) {
  const data = await rfqService.archive(request);
  response.json({ data });
}
