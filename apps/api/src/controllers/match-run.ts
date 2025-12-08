import type { Request, Response } from "express";
import { matchRunService } from "../services/match-run";

export async function listMatchRunsController(request: Request, response: Response) {
  const data = await matchRunService.list(request);
  response.json({ data });
}

export async function createMatchRunController(request: Request, response: Response) {
  const data = await matchRunService.create(request);
  response.status(201).json({ data });
}

export async function getMatchRunController(request: Request, response: Response) {
  const data = await matchRunService.get(request);
  response.json({ data });
}
