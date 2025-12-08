import type { Request, Response } from "express";
import { commandCenterService } from "../services/command-center";

export async function getCommandCenterOverviewController(request: Request, response: Response) {
  const data = await commandCenterService.overview(request);
  response.json({ data });
}

export async function getCommandCenterHealthController(request: Request, response: Response) {
  const data = await commandCenterService.health(request);
  response.json({ data });
}

export async function getCommandCenterPortfolioController(request: Request, response: Response) {
  const data = await commandCenterService.portfolio(request);
  response.json({ data });
}
