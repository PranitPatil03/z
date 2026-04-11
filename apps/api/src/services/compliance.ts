import { complianceItems } from "@foreman/db";
import { and, eq, isNull } from "drizzle-orm";
import type { Request } from "express";
import { env } from "../config/env";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import { enqueueAiTask } from "../lib/queues";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  complianceItemIdParamsSchema,
  createComplianceItemSchema,
  listComplianceItemsQuerySchema,
  queueInsuranceExtractionSchema,
  updateComplianceItemSchema,
} from "../schemas/compliance.schema";

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

function normalizeEvidence(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }
  return value as Record<string, unknown>;
}

function appendReviewTrace(input: {
  evidence: unknown;
  reviewerUserId: string;
  status:
    | "pending"
    | "verified"
    | "expiring"
    | "expired"
    | "non_compliant"
    | "compliant";
  notes: string | null;
}) {
  const current = normalizeEvidence(input.evidence);
  const reviewHistory = Array.isArray(current.reviewHistory)
    ? (current.reviewHistory as Array<Record<string, unknown>>)
    : [];

  const trace = {
    reviewedAt: new Date().toISOString(),
    reviewedByUserId: input.reviewerUserId,
    status: input.status,
    notes: input.notes,
  };

  return {
    ...current,
    lastReview: trace,
    reviewHistory: [...reviewHistory, trace],
  };
}

export const complianceService = {
  async list(request: Request) {
    const { orgId } = requireContext(request);
    const query = listComplianceItemsQuerySchema.parse(
      readValidatedQuery(request),
    );

    const filters = [
      eq(complianceItems.organizationId, orgId),
      isNull(complianceItems.deletedAt),
    ];

    if (query.projectId) {
      filters.push(eq(complianceItems.projectId, query.projectId));
    }

    if (query.subcontractorId) {
      filters.push(eq(complianceItems.subcontractorId, query.subcontractorId));
    }

    if (query.status) {
      filters.push(eq(complianceItems.status, query.status));
    }

    if (query.complianceType) {
      filters.push(eq(complianceItems.complianceType, query.complianceType));
    }

    if (query.highRiskOnly) {
      filters.push(eq(complianceItems.highRisk, true));
    }

    return await db
      .select()
      .from(complianceItems)
      .where(and(...filters));
  },

  async create(request: Request) {
    const { orgId } = requireContext(request);
    const body = createComplianceItemSchema.parse(readValidatedBody(request));

    const [record] = await db
      .insert(complianceItems)
      .values({
        organizationId: orgId,
        projectId: body.projectId,
        subcontractorId: body.subcontractorId ?? null,
        complianceType: body.complianceType,
        status: "pending",
        highRisk: body.highRisk ?? false,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes ?? null,
        evidence: body.evidence ?? null,
      })
      .returning();

    return record;
  },

  async get(request: Request) {
    const { orgId } = requireContext(request);
    const params = complianceItemIdParamsSchema.parse(
      readValidatedParams(request),
    );

    const [record] = await db
      .select()
      .from(complianceItems)
      .where(
        and(
          eq(complianceItems.id, params.complianceItemId),
          eq(complianceItems.organizationId, orgId),
          isNull(complianceItems.deletedAt),
        ),
      );

    if (!record) {
      throw notFound("Compliance item not found");
    }

    return record;
  },

  async update(request: Request) {
    const { orgId, userId } = requireContext(request);
    const params = complianceItemIdParamsSchema.parse(
      readValidatedParams(request),
    );
    const body = updateComplianceItemSchema.parse(readValidatedBody(request));

    const [existing] = await db
      .select()
      .from(complianceItems)
      .where(
        and(
          eq(complianceItems.id, params.complianceItemId),
          eq(complianceItems.organizationId, orgId),
          isNull(complianceItems.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      throw notFound("Compliance item not found");
    }

    const nextStatus = body.status ?? existing.status;
    const nextNotes =
      body.notes === undefined ? existing.notes : (body.notes ?? null);
    const baseEvidence =
      body.evidence === undefined ? existing.evidence : body.evidence;

    const requiresReviewerConfirmation =
      existing.highRisk || body.highRisk === true;
    const statusMovesToVerified =
      nextStatus === "verified" || nextStatus === "compliant";
    if (
      requiresReviewerConfirmation &&
      statusMovesToVerified &&
      body.reviewerConfirmed !== true
    ) {
      throw badRequest(
        "High-risk compliance items require explicit reviewer confirmation before verification",
      );
    }

    const shouldTraceReview =
      body.status !== undefined ||
      body.notes !== undefined ||
      body.evidence !== undefined;
    const nextEvidence = shouldTraceReview
      ? appendReviewTrace({
          evidence: baseEvidence,
          reviewerUserId: userId,
          status: nextStatus,
          notes: nextNotes,
        })
      : baseEvidence;

    const shouldConfirm =
      body.reviewerConfirmed === true && statusMovesToVerified;
    const shouldResetConfirmation =
      nextStatus === "pending" || nextStatus === "non_compliant";

    const [record] = await db
      .update(complianceItems)
      .set({
        ...body,
        highRisk: body.highRisk,
        evidence: nextEvidence,
        reviewerConfirmedAt: shouldConfirm
          ? new Date()
          : shouldResetConfirmation
            ? null
            : undefined,
        reviewerConfirmedByUserId: shouldConfirm
          ? userId
          : shouldResetConfirmation
            ? null
            : undefined,
        dueDate:
          body.dueDate === undefined
            ? undefined
            : body.dueDate
              ? new Date(body.dueDate)
              : null,
        reminderSentAt: body.dueDate !== undefined ? null : undefined,
        escalationSentAt: body.dueDate !== undefined ? null : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(complianceItems.id, params.complianceItemId),
          eq(complianceItems.organizationId, orgId),
          isNull(complianceItems.deletedAt),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Compliance item not found");
    }

    return record;
  },

  async queueInsuranceExtraction(request: Request) {
    const { orgId } = requireContext(request);
    const params = complianceItemIdParamsSchema.parse(
      readValidatedParams(request),
    );
    const body = queueInsuranceExtractionSchema.parse(
      readValidatedBody(request),
    );

    const [item] = await db
      .select()
      .from(complianceItems)
      .where(
        and(
          eq(complianceItems.id, params.complianceItemId),
          eq(complianceItems.organizationId, orgId),
          isNull(complianceItems.deletedAt),
        ),
      )
      .limit(1);

    if (!item) {
      throw notFound("Compliance item not found");
    }

    const prompt = `Extract insurance compliance details from the following content and return strict JSON only.\n\nRequired JSON shape:\n{\n  "carrier": "string|null",\n  "policyNumber": "string|null",\n  "limits": "string|null",\n  "effectiveDate": "ISO-8601|null",\n  "expiryDate": "ISO-8601|null",\n  "additionalInsured": "yes|no|unknown",\n  "confidenceBps": number,\n  "notes": "string"\n}\n\nContent to extract from:\n${body.prompt}`;

    const jobId = await enqueueAiTask({
      provider: body.provider,
      model: body.model ?? env.SITE_SNAP_AI_MODEL ?? "gpt-4.1-mini",
      prompt,
      context: {
        type: "insurance_extraction",
        organizationId: orgId,
        complianceItemId: item.id,
        projectId: item.projectId,
        subcontractorId: item.subcontractorId,
        highRisk: item.highRisk,
        sourceFileName: body.sourceFileName ?? null,
        sourceUrl: body.sourceUrl ?? null,
      },
    });

    return {
      queued: jobId !== null,
      jobId,
      complianceItemId: item.id,
    };
  },

  async archive(request: Request) {
    const { orgId } = requireContext(request);
    const params = complianceItemIdParamsSchema.parse(
      readValidatedParams(request),
    );

    const [record] = await db
      .update(complianceItems)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(complianceItems.id, params.complianceItemId),
          eq(complianceItems.organizationId, orgId),
          isNull(complianceItems.deletedAt),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Compliance item not found");
    }

    return record;
  },
};
