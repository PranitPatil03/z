import type { Request, Response } from "express";
import { storageService } from "../services/storage";

export async function createUploadSessionController(
  request: Request,
  response: Response,
) {
  const data = await storageService.createUploadSession(request);
  response.status(201).json({ data });
}

export async function completeUploadController(
  request: Request,
  response: Response,
) {
  const data = await storageService.completeUpload(request);
  response.json({ data });
}

export async function listFileAssetsController(
  request: Request,
  response: Response,
) {
  const data = await storageService.listByEntity(request);
  response.json({ data });
}

export async function createDownloadUrlController(
  request: Request,
  response: Response,
) {
  const data = await storageService.createDownloadUrl(request);
  response.json({ data });
}

export async function archiveFileAssetController(
  request: Request,
  response: Response,
) {
  const data = await storageService.archive(request);
  response.json({ data });
}
