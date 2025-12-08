import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { fileAssets, siteSnapImages, siteSnapObservations, siteSnaps } from "@foreman/db";
import { and, asc, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import type { Request } from "express";
import { env } from "../config/env";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import { getMaxUploadBytes, getS3Client, getSignedUrlTtlSeconds } from "../lib/s3";
import { enqueueAiTask } from "../lib/queues";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  createObservationSchema,
  createSiteSnapSchema,
  dailyProgressQuerySchema,
  siteSnapIdParamsSchema,
  siteSnapObservationParamsSchema,
  updateObservationSchema,
  updateSiteSnapSchema,
} from "../schemas/site-snap.schema";

function readValidatedBody<T>(request: Request) {
  return (request as ValidatedRequest).validated?.body as T;
}

function readValidatedParams<T>(request: Request) {
  return (request as ValidatedRequest).validated?.params as T;
}

function readValidatedQuery<T>(request: Request) {
  return (request as ValidatedRequest).validated?.query as T;
}

function requireContext(request: Request) {
  const { session, user } = getAuthContext(request);
  if (!session.activeOrganizationId) {
    throw badRequest("An active organization is required");
  }
  return { orgId: session.activeOrganizationId, userId: user.id };
}

type FileAssetRecord = typeof fileAssets.$inferSelect;

const DEFAULT_SITE_SNAP_AI_MODEL = "gpt-4.1-mini";
const DEFAULT_ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const DEFAULT_ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
const DEFAULT_SITE_SNAP_MIN_IMAGE_BYTES = 50 * 1024;
const DEFAULT_SITE_SNAP_SAFETY_ALERT_MIN_CONFIDENCE_BPS = 7000;

function parseAssetReference(value: string) {
  return value.startsWith("asset://") ? value.slice("asset://".length) : null;
}

function getAllowedImageTypes() {
  const configured = env.SITE_SNAP_ALLOWED_IMAGE_TYPES
    ?.split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return new Set(configured && configured.length > 0 ? configured : DEFAULT_ALLOWED_IMAGE_TYPES);
}

function getMinImageBytes() {
  return env.SITE_SNAP_MIN_IMAGE_BYTES ?? DEFAULT_SITE_SNAP_MIN_IMAGE_BYTES;
}

function getSafetyAlertMinConfidenceBps() {
  return env.SITE_SNAP_SAFETY_ALERT_MIN_CONFIDENCE_BPS ?? DEFAULT_SITE_SNAP_SAFETY_ALERT_MIN_CONFIDENCE_BPS;
}

function getSiteSnapAiModel() {
  return env.SITE_SNAP_AI_MODEL ?? DEFAULT_SITE_SNAP_AI_MODEL;
}

function toImageAssetReference(fileAssetId: string) {
  return `asset://${fileAssetId}`;
}

function isImageUrlAllowed(rawUrl: string) {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return false;
  }

  if (!["https:", "http:"].includes(parsedUrl.protocol)) {
    return false;
  }

  const pathname = parsedUrl.pathname.toLowerCase();
  const extension = pathname.includes(".") ? pathname.split(".").pop() : null;
  if (!extension) {
    return false;
  }

  return DEFAULT_ALLOWED_IMAGE_EXTENSIONS.includes(extension);
}

function readAssetDimension(metadata: Record<string, unknown> | null | undefined, key: "width" | "height") {
  const value = metadata?.[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

async function validateImageFileAssets(orgId: string, fileAssetIds: string[]) {
  const uniqueFileAssetIds = Array.from(new Set(fileAssetIds));
  if (uniqueFileAssetIds.length === 0) {
    return [] as FileAssetRecord[];
  }

  const assets = await db
    .select()
    .from(fileAssets)
    .where(
      and(
        eq(fileAssets.organizationId, orgId),
        inArray(fileAssets.id, uniqueFileAssetIds),
        isNull(fileAssets.deletedAt),
      ),
    );

  if (assets.length !== uniqueFileAssetIds.length) {
    throw badRequest("One or more image file assets were not found");
  }

  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  const orderedAssets = uniqueFileAssetIds.map((fileAssetId) => byId.get(fileAssetId)).filter(Boolean) as FileAssetRecord[];

  const allowedImageTypes = getAllowedImageTypes();
  const minImageBytes = getMinImageBytes();
  const maxImageBytes = getMaxUploadBytes();

  for (const asset of orderedAssets) {
    if (asset.status !== "uploaded") {
      throw badRequest(`File asset ${asset.id} is not uploaded yet`);
    }

    if (!allowedImageTypes.has(asset.contentType.toLowerCase())) {
      throw badRequest(`File asset ${asset.id} has unsupported image type ${asset.contentType}`);
    }

    if (asset.sizeBytes < minImageBytes) {
      throw badRequest(`File asset ${asset.id} failed quality gate (image too small)`);
    }

    if (asset.sizeBytes > maxImageBytes) {
      throw badRequest(`File asset ${asset.id} exceeds max size limit`);
    }

    const width = readAssetDimension(asset.metadata, "width");
    const height = readAssetDimension(asset.metadata, "height");
    if (width !== null && height !== null && (width < 640 || height < 480)) {
      throw badRequest(`File asset ${asset.id} failed quality gate (min 640x480 required)`);
    }
  }

  return orderedAssets;
}

function validateExternalImageUrls(imageUrls: string[]) {
  for (const imageUrl of imageUrls) {
    if (!isImageUrlAllowed(imageUrl)) {
      throw badRequest(`Image URL is not allowed: ${imageUrl}`);
    }
  }
}

async function resolveIncomingImageReferences(input: {
  orgId: string;
  imageUrls?: string[];
  imageFileAssetIds?: string[];
}) {
  const imageUrls = input.imageUrls ?? [];
  const imageFileAssetIds = input.imageFileAssetIds ?? [];

  validateExternalImageUrls(imageUrls);
  const linkedFileAssets = await validateImageFileAssets(input.orgId, imageFileAssetIds);

  const imageReferences = [
    ...imageUrls,
    ...linkedFileAssets.map((asset) => toImageAssetReference(asset.id)),
  ];

  if (imageReferences.length < 1 || imageReferences.length > 10) {
    throw badRequest("Site snap requires 1-10 images");
  }

  return {
    imageReferences,
    linkedFileAssets,
  };
}

async function linkAssetsToSiteSnap(input: {
  orgId: string;
  projectId: string;
  siteSnapId: string;
  linkedFileAssets: FileAssetRecord[];
}) {
  if (input.linkedFileAssets.length === 0) {
    return;
  }

  const linkedFileAssetIds = input.linkedFileAssets.map((asset) => asset.id);

  await db
    .update(fileAssets)
    .set({
      entityType: "site_snap_image",
      entityId: input.siteSnapId,
      projectId: input.projectId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(fileAssets.organizationId, input.orgId),
        inArray(fileAssets.id, linkedFileAssetIds),
        isNull(fileAssets.deletedAt),
      ),
    );
}

async function resolveSiteSnapImages(orgId: string, images: Array<typeof siteSnapImages.$inferSelect>) {
  const s3Client = getS3Client();
  const expiresIn = getSignedUrlTtlSeconds();

  const fileAssetIds = images
    .map((image) => parseAssetReference(image.imageUrl))
    .filter((value): value is string => Boolean(value));

  const fileAssetRecords = fileAssetIds.length > 0
    ? await db
        .select()
        .from(fileAssets)
        .where(
          and(
            eq(fileAssets.organizationId, orgId),
            inArray(fileAssets.id, Array.from(new Set(fileAssetIds))),
            isNull(fileAssets.deletedAt),
          ),
        )
    : [];

  const fileAssetById = new Map(fileAssetRecords.map((asset) => [asset.id, asset]));

  return await Promise.all(
    images.map(async (image) => {
      const fileAssetId = parseAssetReference(image.imageUrl);
      if (!fileAssetId) {
        return {
          ...image,
          sourceType: "external_url" as const,
        };
      }

      const asset = fileAssetById.get(fileAssetId);
      if (!asset || asset.status !== "uploaded" || !s3Client) {
        return {
          ...image,
          imageUrl: null,
          fileAssetId,
          sourceType: "file_asset" as const,
        };
      }

      const signedDownloadUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: asset.bucket,
          Key: asset.storageKey,
        }),
        { expiresIn },
      );

      return {
        ...image,
        imageUrl: signedDownloadUrl,
        fileAssetId,
        sourceType: "file_asset" as const,
        originalImageUrl: image.imageUrl,
      };
    }),
  );
}

function buildSiteSnapAnalysisPrompt(input: {
  projectId: string;
  locationZone: string;
  notes: string;
  imageReferences: string[];
}) {
  const imageLines = input.imageReferences.map((value, index) => `- image_${index + 1}: ${value}`).join("\n");

  return [
    "You are a construction field analyst.",
    `Project: ${input.projectId}`,
    `Zone: ${input.locationZone}`,
    `Notes: ${input.notes}`,
    "Image references:",
    imageLines,
    "",
    "Return strict JSON only with this shape:",
    '{"observations":[{"category":"work_progress|safety_issue|material_present|site_condition|equipment","confidenceBps":0-10000,"detail":"string"}],"summary":"string"}',
    "",
    "Rules:",
    "- Include at least one observation when useful evidence exists.",
    "- Use category safety_issue for potential hazards.",
    "- Keep details concise and actionable.",
  ].join("\n");
}

export const siteSnapService = {
  async list(request: Request) {
    const { orgId } = requireContext(request);
    const query = readValidatedQuery<{ projectId: string }>(request);
    return await db.select().from(siteSnaps).where(and(eq(siteSnaps.organizationId, orgId), eq(siteSnaps.projectId, query.projectId)));
  },

  async create(request: Request) {
    const { orgId, userId } = requireContext(request);
    const body = createSiteSnapSchema.parse(readValidatedBody(request));
    const { imageReferences, linkedFileAssets } = await resolveIncomingImageReferences({
      orgId,
      imageUrls: body.imageUrls,
      imageFileAssetIds: body.imageFileAssetIds,
    });

    const [snap] = await db
      .insert(siteSnaps)
      .values({
        organizationId: orgId,
        projectId: body.projectId,
        createdByUserId: userId,
        notes: body.notes,
        locationZone: body.locationZone,
      })
      .returning();

    await db.insert(siteSnapImages).values(
      imageReferences.map((imageUrl, index) => ({
        snapId: snap.id,
        imageUrl,
        position: index,
      })),
    );

    await linkAssetsToSiteSnap({
      orgId,
      projectId: snap.projectId,
      siteSnapId: snap.id,
      linkedFileAssets,
    });

    return snap;
  },

  async get(request: Request) {
    const { orgId } = requireContext(request);
    const params = siteSnapIdParamsSchema.parse(readValidatedParams(request));

    const [snap] = await db
      .select()
      .from(siteSnaps)
      .where(and(eq(siteSnaps.id, params.siteSnapId), eq(siteSnaps.organizationId, orgId)));

    if (!snap) {
      throw notFound("Site snap not found");
    }

    const images = await db
      .select()
      .from(siteSnapImages)
      .where(eq(siteSnapImages.snapId, snap.id))
      .orderBy(asc(siteSnapImages.position));
    const observations = await db.select().from(siteSnapObservations).where(eq(siteSnapObservations.snapId, snap.id));
    const resolvedImages = await resolveSiteSnapImages(orgId, images);

    return {
      ...snap,
      images: resolvedImages,
      observations,
    };
  },

  async update(request: Request) {
    const { orgId } = requireContext(request);
    const params = siteSnapIdParamsSchema.parse(readValidatedParams(request));
    const body = updateSiteSnapSchema.parse(readValidatedBody(request));

    const [snap] = await db
      .update(siteSnaps)
      .set({
        notes: body.notes,
        locationZone: body.locationZone,
        updatedAt: new Date(),
      })
      .where(and(eq(siteSnaps.id, params.siteSnapId), eq(siteSnaps.organizationId, orgId)))
      .returning();

    if (!snap) {
      throw notFound("Site snap not found");
    }

    const hasImageUpdate = body.imageUrls !== undefined || body.imageFileAssetIds !== undefined;
    if (hasImageUpdate) {
      const { imageReferences, linkedFileAssets } = await resolveIncomingImageReferences({
        orgId,
        imageUrls: body.imageUrls,
        imageFileAssetIds: body.imageFileAssetIds,
      });

      await db.delete(siteSnapImages).where(eq(siteSnapImages.snapId, snap.id));
      await db.insert(siteSnapImages).values(
        imageReferences.map((imageUrl, index) => ({
          snapId: snap.id,
          imageUrl,
          position: index,
        })),
      );

      await linkAssetsToSiteSnap({
        orgId,
        projectId: snap.projectId,
        siteSnapId: snap.id,
        linkedFileAssets,
      });
    }

    return snap;
  },

  async analyze(request: Request) {
    const { orgId } = requireContext(request);
    const params = siteSnapIdParamsSchema.parse(readValidatedParams(request));

    const [snap] = await db
      .select()
      .from(siteSnaps)
      .where(and(eq(siteSnaps.id, params.siteSnapId), eq(siteSnaps.organizationId, orgId)));

    if (!snap) {
      throw notFound("Site snap not found");
    }

    const images = await db
      .select()
      .from(siteSnapImages)
      .where(eq(siteSnapImages.snapId, snap.id))
      .orderBy(asc(siteSnapImages.position));

    if (images.length === 0) {
      throw badRequest("Site snap must have at least one image before analysis");
    }

    const model = getSiteSnapAiModel();
    const prompt = buildSiteSnapAnalysisPrompt({
      projectId: snap.projectId,
      locationZone: snap.locationZone,
      notes: snap.notes,
      imageReferences: images.map((image) => image.imageUrl),
    });

    const jobId = await enqueueAiTask({
      provider: env.SITE_SNAP_AI_PROVIDER,
      model,
      prompt,
      context: {
        type: "site_snap_analysis",
        siteSnapId: snap.id,
        organizationId: orgId,
        projectId: snap.projectId,
        safetyAlertMinConfidenceBps: getSafetyAlertMinConfidenceBps(),
      },
    });

    const [updated] = await db
      .update(siteSnaps)
      .set({
        status: "analyzing",
        analysisState: jobId ? "queued" : "queue_unavailable",
        analysisJobId: jobId ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(siteSnaps.id, snap.id))
      .returning();

    return updated;
  },

  async reanalyze(request: Request) {
    return await this.analyze(request);
  },

  async review(request: Request) {
    const { orgId } = requireContext(request);
    const params = siteSnapIdParamsSchema.parse(readValidatedParams(request));

    const [snap] = await db
      .update(siteSnaps)
      .set({
        status: "reviewed",
        analysisState: "reviewed",
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(siteSnaps.id, params.siteSnapId), eq(siteSnaps.organizationId, orgId)))
      .returning();

    if (!snap) {
      throw notFound("Site snap not found");
    }

    return snap;
  },

  async createObservation(request: Request) {
    const { orgId } = requireContext(request);
    const params = siteSnapIdParamsSchema.parse(readValidatedParams(request));
    const body = createObservationSchema.parse(readValidatedBody(request));

    const [snap] = await db
      .select()
      .from(siteSnaps)
      .where(and(eq(siteSnaps.id, params.siteSnapId), eq(siteSnaps.organizationId, orgId)));

    if (!snap) {
      throw notFound("Site snap not found");
    }

    const [observation] = await db
      .insert(siteSnapObservations)
      .values({
        snapId: snap.id,
        category: body.category,
        confidenceBps: body.confidenceBps,
        detail: body.detail,
        source: body.source,
      })
      .returning();

    return observation;
  },

  async updateObservation(request: Request) {
    const { orgId } = requireContext(request);
    const params = siteSnapObservationParamsSchema.parse(readValidatedParams(request));
    const body = updateObservationSchema.parse(readValidatedBody(request));

    const [snap] = await db
      .select()
      .from(siteSnaps)
      .where(and(eq(siteSnaps.id, params.siteSnapId), eq(siteSnaps.organizationId, orgId)));

    if (!snap) {
      throw notFound("Site snap not found");
    }

    const [observation] = await db
      .update(siteSnapObservations)
      .set({
        category: body.category,
        confidenceBps: body.confidenceBps,
        detail: body.detail,
        updatedAt: new Date(),
      })
      .where(and(eq(siteSnapObservations.id, params.observationId), eq(siteSnapObservations.snapId, snap.id)))
      .returning();

    if (!observation) {
      throw notFound("Observation not found");
    }

    return observation;
  },

  async deleteObservation(request: Request) {
    const { orgId } = requireContext(request);
    const params = siteSnapObservationParamsSchema.parse(readValidatedParams(request));

    const [snap] = await db
      .select()
      .from(siteSnaps)
      .where(and(eq(siteSnaps.id, params.siteSnapId), eq(siteSnaps.organizationId, orgId)));

    if (!snap) {
      throw notFound("Site snap not found");
    }

    const [deleted] = await db
      .delete(siteSnapObservations)
      .where(and(eq(siteSnapObservations.id, params.observationId), eq(siteSnapObservations.snapId, snap.id)))
      .returning();

    if (!deleted) {
      throw notFound("Observation not found");
    }

    return deleted;
  },

  async dailyProgress(request: Request) {
    const { orgId } = requireContext(request);
    const query = dailyProgressQuerySchema.parse(readValidatedQuery(request));

    const day = query.day ? new Date(query.day) : new Date();
    const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const snaps = await db
      .select()
      .from(siteSnaps)
      .where(
        and(
          eq(siteSnaps.organizationId, orgId),
          eq(siteSnaps.projectId, query.projectId),
          gte(siteSnaps.createdAt, start),
          lt(siteSnaps.createdAt, end),
        ),
      );

    const snapIds = snaps.map((snap) => snap.id);
    const observations = snapIds.length > 0
      ? await db.select().from(siteSnapObservations).where(inArray(siteSnapObservations.snapId, snapIds))
      : [];

    const reviewedCount = snaps.filter((snap) => snap.status === "reviewed").length;
    const categoryCounts = observations.reduce<Record<string, number>>((acc, obs) => {
      acc[obs.category] = (acc[obs.category] ?? 0) + 1;
      return acc;
    }, {});

    return {
      day: start.toISOString().slice(0, 10),
      projectId: query.projectId,
      snapCount: snaps.length,
      reviewedCount,
      observationCount: observations.length,
      categoryCounts,
    };
  },
};
