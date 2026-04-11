import type { Request, Response } from "express";
import { aiService } from "../services/ai";

export async function generateAiTextController(
  request: Request,
  response: Response,
) {
  const data = await aiService.generateText(request);
  response.json({ data });
}

export async function buildAiEstimateController(
  request: Request,
  response: Response,
) {
  const data = await aiService.buildEstimate(request);
  response.json({ data });
}

export async function getAiJobStatusController(
  request: Request,
  response: Response,
) {
  const data = await aiService.getJobStatus(request);
  response.json({ data });
}
