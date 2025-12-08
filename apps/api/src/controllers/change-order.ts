import type { Request, Response } from "express";
import { changeOrderService } from "../services/change-order";

export async function listChangeOrdersController(request: Request, response: Response) {
  const data = await changeOrderService.list(request);
  response.json({ data });
}

export async function createChangeOrderController(request: Request, response: Response) {
  const data = await changeOrderService.create(request);
  response.status(201).json({ data });
}

export async function getChangeOrderController(request: Request, response: Response) {
  const data = await changeOrderService.get(request);
  response.json({ data });
}

export async function updateChangeOrderController(request: Request, response: Response) {
  const data = await changeOrderService.update(request);
  response.json({ data });
}

export async function submitChangeOrderController(request: Request, response: Response) {
  const data = await changeOrderService.submit(request);
  response.json({ data });
}

export async function decideChangeOrderController(request: Request, response: Response) {
  const data = await changeOrderService.decide(request);
  response.json({ data });
}
