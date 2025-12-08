import type { Request, Response } from "express";
import { purchaseOrderService } from "../services/purchase-order";

export async function listPurchaseOrdersController(request: Request, response: Response) {
  const data = await purchaseOrderService.list(request);
  response.json({ data });
}

export async function createPurchaseOrderController(request: Request, response: Response) {
  const data = await purchaseOrderService.create(request);
  response.status(201).json({ data });
}

export async function getPurchaseOrderController(request: Request, response: Response) {
  const data = await purchaseOrderService.get(request);
  response.json({ data });
}

export async function updatePurchaseOrderController(request: Request, response: Response) {
  const data = await purchaseOrderService.update(request);
  response.json({ data });
}

export async function archivePurchaseOrderController(request: Request, response: Response) {
  const data = await purchaseOrderService.archive(request);
  response.json({ data });
}
