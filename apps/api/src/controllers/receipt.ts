import type { Request, Response } from "express";
import { receiptService } from "../services/receipt";

export async function listReceiptsController(request: Request, response: Response) {
  const data = await receiptService.list(request);
  response.json({ data });
}

export async function createReceiptController(request: Request, response: Response) {
  const data = await receiptService.create(request);
  response.status(201).json({ data });
}

export async function getReceiptController(request: Request, response: Response) {
  const data = await receiptService.get(request);
  response.json({ data });
}

export async function updateReceiptController(request: Request, response: Response) {
  const data = await receiptService.update(request);
  response.json({ data });
}

export async function archiveReceiptController(request: Request, response: Response) {
  const data = await receiptService.archive(request);
  response.json({ data });
}
