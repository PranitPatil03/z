import { z } from "zod";

export const fileAssetIdParamsSchema = z.object({
  fileAssetId: z.string().min(1),
});

export const createUploadSessionSchema = z.object({
  projectId: z.string().min(1).optional(),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const completeUploadSchema = z.object({
  eTag: z.string().min(1).optional(),
});

export const listFileAssetsQuerySchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
});
