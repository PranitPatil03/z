import { Router } from "express";
import {
  archiveFileAssetController,
  completeUploadController,
  createDownloadUrlController,
  createUploadSessionController,
  listFileAssetsController,
} from "../controllers/storage";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams, validateQuery } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import {
  completeUploadSchema,
  createUploadSessionSchema,
  fileAssetIdParamsSchema,
  listFileAssetsQuerySchema,
} from "../schemas/storage.schema";

export const storageRouter: import("express").Router = Router();

storageRouter.use(requireAuth);

storageRouter.get("/", validateQuery(listFileAssetsQuerySchema), asyncHandler(listFileAssetsController));
storageRouter.post("/upload-session", validateBody(createUploadSessionSchema), asyncHandler(createUploadSessionController));
storageRouter.post(
  "/:fileAssetId/complete",
  validateParams(fileAssetIdParamsSchema),
  validateBody(completeUploadSchema),
  asyncHandler(completeUploadController),
);
storageRouter.get(
  "/:fileAssetId/download-url",
  validateParams(fileAssetIdParamsSchema),
  asyncHandler(createDownloadUrlController),
);
storageRouter.delete(
  "/:fileAssetId",
  validateParams(fileAssetIdParamsSchema),
  asyncHandler(archiveFileAssetController),
);
