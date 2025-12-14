import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env";

function normalizePrefix(prefix: string | undefined) {
  if (!prefix) {
    return "";
  }
  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}

export function getS3Client() {
  if (!env.STORAGE_PROVIDER || env.STORAGE_PROVIDER !== "aws-s3") {
    return null;
  }

  if (!env.AWS_REGION) {
    return null;
  }

  if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
    return new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  return new S3Client({ region: env.AWS_REGION });
}

export function getStorageBucket() {
  return env.S3_BUCKET;
}

export function getSignedUrlTtlSeconds() {
  return env.S3_SIGNED_URL_TTL_SECONDS ?? 900;
}

export function getMaxUploadBytes() {
  const maxUploadMb = env.S3_MAX_UPLOAD_MB ?? 25;
  return maxUploadMb * 1024 * 1024;
}

export function buildStorageKey(input: {
  organizationId: string;
  entityType: string;
  entityId: string;
  fileId: string;
  fileName: string;
}) {
  const safeName = input.fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 128);
  const prefix = normalizePrefix(env.S3_PREFIX);
  return `${prefix}${input.organizationId}/${input.entityType}/${input.entityId}/${input.fileId}-${safeName}`;
}
