import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { sql } from "drizzle-orm";
import { createClient } from "redis";
import { env } from "../config/env";
import { db } from "../database";
import { getS3Client, getStorageBucket } from "../lib/s3";

export function healthService() {
  return {
    status: "ok",
    service: "api",
    time: new Date().toISOString(),
  };
}

async function checkDatabase() {
  try {
    await db.execute(sql`select 1`);
    return { status: "ok" as const };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

async function checkRedis() {
  if (!env.REDIS_URL) {
    return { status: "skipped" as const, message: "REDIS_URL not configured" };
  }

  const client = createClient({ url: env.REDIS_URL });
  try {
    await client.connect();
    const pong = await client.ping();
    return { status: pong === "PONG" ? ("ok" as const) : ("error" as const) };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Unknown redis error",
    };
  } finally {
    try {
      await client.quit();
    } catch {
      // No-op: health checks should not throw during shutdown cleanup.
    }
  }
}

async function checkStorage() {
  if (env.STORAGE_PROVIDER !== "aws-s3") {
    return { status: "skipped" as const, message: "Storage provider not configured" };
  }

  const bucket = getStorageBucket();
  const s3 = getS3Client();
  if (!bucket || !s3) {
    return { status: "error" as const, message: "S3 bucket or client configuration missing" };
  }

  try {
    await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: env.S3_PREFIX ?? "",
        MaxKeys: 1,
      }),
    );
    return { status: "ok" as const };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Unknown storage error",
    };
  }
}

function checkEmailConfiguration() {
  if (env.EMAIL_PROVIDER === "resend") {
    if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
      return { status: "ok" as const };
    }
    return { status: "error" as const, message: "Resend provider is missing API key or from email" };
  }

  if (env.SMTP_HOST && env.SMTP_PORT && env.SMTP_FROM) {
    return { status: "ok" as const };
  }

  return {
    status: "skipped" as const,
    message: "No email provider configured",
  };
}

export async function readinessService() {
  const [database, redis, storage] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkStorage(),
  ]);
  const email = checkEmailConfiguration();

  const requiredChecks = [database, redis, storage].filter((check) => check.status !== "skipped");
  const ready = requiredChecks.every((check) => check.status === "ok");

  return {
    status: ready ? "ok" : "degraded",
    service: "api",
    ready,
    time: new Date().toISOString(),
    checks: {
      database,
      redis,
      storage,
      email,
    },
  };
}
