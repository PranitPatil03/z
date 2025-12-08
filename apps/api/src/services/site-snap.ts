import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { siteSnapImages, siteSnapObservations, siteSnaps } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
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

export const siteSnapService = {
  async list(request: Request) {
    const { orgId } = requireContext(request);
    const query = readValidatedQuery<{ projectId: string }>(request);
    return await db.select().from(siteSnaps).where(and(eq(siteSnaps.organizationId, orgId), eq(siteSnaps.projectId, query.projectId)));
  },

  async create(request: Request) {
    const { orgId, userId } = requireContext(request);
    const body = createSiteSnapSchema.parse(readValidatedBody(request));

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
      body.imageUrls.map((imageUrl, index) => ({
        snapId: snap.id,
        imageUrl,
        position: index,
      })),
    );

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

    const images = await db.select().from(siteSnapImages).where(eq(siteSnapImages.snapId, snap.id));
    const observations = await db.select().from(siteSnapObservations).where(eq(siteSnapObservations.snapId, snap.id));

    return {
      ...snap,
      images,
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

    if (body.imageUrls) {
      await db.delete(siteSnapImages).where(eq(siteSnapImages.snapId, snap.id));
      await db.insert(siteSnapImages).values(
        body.imageUrls.map((imageUrl, index) => ({
          snapId: snap.id,
          imageUrl,
          position: index,
        })),
      );
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

    const jobId = await enqueueAiTask({
      model: "gpt-4.1-mini",
      prompt: `Analyze field snapshot for project ${snap.projectId}. Zone: ${snap.locationZone}. Notes: ${snap.notes}`,
      context: {
        siteSnapId: snap.id,
        organizationId: orgId,
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
