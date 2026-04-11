import type { Request, Response } from "express";
import { invoiceService } from "../services/invoice";

export async function listInvoicesController(
  request: Request,
  response: Response,
) {
  const data = await invoiceService.list(request);
  response.json({ data });
}

export async function createInvoiceController(
  request: Request,
  response: Response,
) {
  const data = await invoiceService.create(request);
  response.status(201).json({ data });
}

export async function getInvoiceController(
  request: Request,
  response: Response,
) {
  const data = await invoiceService.get(request);
  response.json({ data });
}

export async function updateInvoiceController(
  request: Request,
  response: Response,
) {
  const data = await invoiceService.update(request);
  response.json({ data });
}

export async function archiveInvoiceController(
  request: Request,
  response: Response,
) {
  const data = await invoiceService.archive(request);
  response.json({ data });
}
