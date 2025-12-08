import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { and, eq, isNull } from "drizzle-orm";
import { fileAssets } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import {
  buildStorageKey,
  getMaxUploadBytes,
  getS3Client,
  getSignedUrlTtlSeconds,
  getStorageBucket,
} from "../lib/s3";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  completeUploadSchema,
  createUploadSessionSchema,
  fileAssetIdParamsSchema,
  listFileAssetsQuerySchema,
} from "../schemas/storage.schema";

function readValidatedBody<T>(request: Request) {
  return (request as ValidatedRequest).validated?.body as T;
}

function readValidatedParams<T>(request: Request) {
  return (request as ValidatedRequest).validated?.params as T;
}

function readValidatedQuery<T>(request: Request) {
  return (request as ValidatedRequest).validated?.query as T;
}

function requireStorage() {
  const bucket = getStorageBucket();
  const s3 = getS3Client();
  if (!bucket || !s3) {
    throw badRequest("Storage is not configured");
  }
  return { bucket, s3 };
}

function requireContext(request: Request) {
  const { session, user } = getAuthContext(request);
  if (!session.activeOrganizationId) {
    throw badRequest("An active organization is required");
  }
  return {
    orgId: session.activeOrganizationId,
    userId: user.id,
  };
}

export const storageService = {
  async createUploadSession(request: Request) {
    const { orgId, userId } = requireContext(request);
    const body = createUploadSessionSchema.parse(readValidatedBody(request));
    const { bucket, s3 } = requireStorage();

    const maxUploadBytes = getMaxUploadBytes();
    if (body.sizeBytes > maxUploadBytes) {
      throw badRequest(`File too large. Max upload size is ${Math.floor(maxUploadBytes / 1024 / 1024)}MB`);
    }

    const [asset] = await db
      .insert(fileAssets)
      .values({
        organizationId: orgId,
        projectId: body.projectId ?? null,
        entityType: body.entityType,
        entityId: body.entityId,
        uploadedByUserId: userId,
        bucket,
        storageKey: "pending",
        fileName: body.fileName,
        contentType: body.contentType,
        sizeBytes: body.sizeBytes,
        status: "pending",
        metadata: body.metadata ?? null,
      })
      .returning();

    const storageKey = buildStorageKey({
      organizationId: orgId,
      entityType: body.entityType,
      entityId: body.entityId,
      fileId: asset.id,
      fileName: body.fileName,
    });

    await db
      .update(fileAssets)
      .set({ storageKey, updatedAt: new Date() })
      .where(eq(fileAssets.id, asset.id));

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      ContentType: body.contentType,
      ServerSideEncryption: "AES256",
      Metadata: {
        organizationId: orgId,
        entityType: body.entityType,
        entityId: body.entityId,
        uploadedByUserId: userId,
      },
    });

    const expiresIn = getSignedUrlTtlSeconds();
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn });

    return {
      fileAssetId: asset.id,
      bucket,
      storageKey,
      uploadUrl,
      expiresIn,
      requiredHeaders: {
        "x-amz-server-side-encryption": "AES256",
        "content-type": body.contentType,
      },
    };
  },

  async completeUpload(request: Request) {
    const { orgId } = requireContext(request);
    const params = fileAssetIdParamsSchema.parse(readValidatedParams(request));
    const body = completeUploadSchema.parse(readValidatedBody(request));

    const [asset] = await db
      .update(fileAssets)
      .set({
        status: "uploaded",
        eTag: body.eTag,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(fileAssets.id, params.fileAssetId),
          eq(fileAssets.organizationId, orgId),
          isNull(fileAssets.deletedAt),
        ),
      )
      .returning();

    if (!asset) {
      throw notFound("File asset not found");
    }

    return asset;
  },

  async listByEntity(request: Request) {
    const { orgId } = requireContext(request);
    const query = listFileAssetsQuerySchema.parse(readValidatedQuery(request));

    return await db
      .select()
      .from(fileAssets)
      .where(
        and(
          eq(fileAssets.organizationId, orgId),
          eq(fileAssets.entityType, query.entityType),
          eq(fileAssets.entityId, query.entityId),
          isNull(fileAssets.deletedAt),
        ),
      );
  },

  async createDownloadUrl(request: Request) {
    const { orgId } = requireContext(request);
    const { bucket, s3 } = requireStorage();
    const params = fileAssetIdParamsSchema.parse(readValidatedParams(request));

    const [asset] = await db
      .select()
      .from(fileAssets)
      .where(
        and(
          eq(fileAssets.id, params.fileAssetId),
          eq(fileAssets.organizationId, orgId),
          isNull(fileAssets.deletedAt),
        ),
      )
      .limit(1);

    if (!asset || asset.status !== "uploaded") {
      throw notFound("Uploaded file asset not found");
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: asset.storageKey,
    });

    const expiresIn = getSignedUrlTtlSeconds();
    const downloadUrl = await getSignedUrl(s3, command, { expiresIn });

    return {
      fileAssetId: asset.id,
      downloadUrl,
      expiresIn,
    };
  },

  async archive(request: Request) {
    const { orgId } = requireContext(request);
    const params = fileAssetIdParamsSchema.parse(readValidatedParams(request));

    const [asset] = await db
      .update(fileAssets)
      .set({
        status: "deleted",
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(fileAssets.id, params.fileAssetId),
          eq(fileAssets.organizationId, orgId),
          isNull(fileAssets.deletedAt),
        ),
      )
      .returning();

    if (!asset) {
      throw notFound("File asset not found");
    }

    return asset;
  },
};
