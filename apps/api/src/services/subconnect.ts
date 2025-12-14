import {
  complianceRequirementTemplates,
  dailyLogStatusEvents,
  dailyLogs,
  payApplicationLineItems,
  payApplicationStatusEvents,
  payApplications,
  subcontractorInvitations,
  subcontractorPrequalificationScores,
  subcontractors,
} from "@foreman/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  applyComplianceTemplatesSchema,
  complianceTemplateIdParamsSchema,
  createComplianceTemplateSchema,
  listComplianceTemplatesQuerySchema,
  updateComplianceTemplateSchema,
} from "../schemas/compliance.schema";
import {
  dailyLogIdParamsSchema,
  listInternalDailyLogsQuerySchema,
  listInternalPayApplicationsQuerySchema,
  listSubconnectInvitationsQuerySchema,
  payApplicationIdParamsSchema,
  reviewDailyLogSchema,
  reviewPayApplicationSchema,
  subcontractorIdParamsSchema,
  upsertPrequalificationScoreSchema,
} from "../schemas/subconnect.schema";
import {
  applyComplianceTemplatesForSubcontractor,
  riskLevelFromScore,
} from "./subconnect-utils";

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
  return {
    orgId: session.activeOrganizationId,
    userId: user.id,
  };
}

async function ensureSubcontractor(orgId: string, subcontractorId: string) {
  const [record] = await db
    .select()
    .from(subcontractors)
    .where(
      and(
        eq(subcontractors.id, subcontractorId),
        eq(subcontractors.organizationId, orgId),
        isNull(subcontractors.deletedAt),
      ),
    )
    .limit(1);

  if (!record) {
    throw notFound("Subcontractor not found");
  }

  return record;
}

export const subconnectService = {
  async listInvitations(request: Request) {
    const { orgId } = requireContext(request);
    const query = listSubconnectInvitationsQuerySchema.parse(
      readValidatedQuery(request),
    );

    const filters = [eq(subcontractorInvitations.organizationId, orgId)];
    if (query.projectId) {
      filters.push(eq(subcontractorInvitations.projectId, query.projectId));
    }
    if (query.subcontractorId) {
      filters.push(
        eq(subcontractorInvitations.subcontractorId, query.subcontractorId),
      );
    }
    if (query.status) {
      filters.push(eq(subcontractorInvitations.status, query.status));
    }

    return await db
      .select()
      .from(subcontractorInvitations)
      .where(and(...filters))
      .orderBy(desc(subcontractorInvitations.createdAt))
      .limit(query.limit);
  },

  async upsertPrequalificationScore(request: Request) {
    const { orgId, userId } = requireContext(request);
    const body = upsertPrequalificationScoreSchema.parse(
      readValidatedBody(request),
    );

    const subcontractor = await ensureSubcontractor(
      orgId,
      body.subcontractorId,
    );
    const projectId = body.projectId ?? subcontractor.projectId ?? null;

    const [record] = await db
      .insert(subcontractorPrequalificationScores)
      .values({
        organizationId: orgId,
        subcontractorId: subcontractor.id,
        projectId,
        overallScoreBps: body.overallScoreBps,
        safetyScoreBps: body.safetyScoreBps ?? null,
        financialScoreBps: body.financialScoreBps ?? null,
        complianceScoreBps: body.complianceScoreBps ?? null,
        capacityScoreBps: body.capacityScoreBps ?? null,
        riskLevel: body.riskLevel ?? riskLevelFromScore(body.overallScoreBps),
        modelVersion: body.modelVersion ?? "v1",
        notes: body.notes ?? null,
        metadata: body.metadata ?? null,
        scoredByUserId: userId,
      })
      .returning();

    return record;
  },

  async getLatestPrequalificationScore(request: Request) {
    const { orgId } = requireContext(request);
    const params = subcontractorIdParamsSchema.parse(
      readValidatedParams(request),
    );

    await ensureSubcontractor(orgId, params.subcontractorId);

    const [record] = await db
      .select()
      .from(subcontractorPrequalificationScores)
      .where(
        and(
          eq(subcontractorPrequalificationScores.organizationId, orgId),
          eq(
            subcontractorPrequalificationScores.subcontractorId,
            params.subcontractorId,
          ),
        ),
      )
      .orderBy(desc(subcontractorPrequalificationScores.createdAt))
      .limit(1);

    if (!record) {
      throw notFound("Prequalification score not found");
    }

    return record;
  },

  async listComplianceTemplates(request: Request) {
    const { orgId } = requireContext(request);
    const query = listComplianceTemplatesQuerySchema.parse(
      readValidatedQuery(request),
    );

    return await db
      .select()
      .from(complianceRequirementTemplates)
      .where(
        and(
          eq(complianceRequirementTemplates.organizationId, orgId),
          eq(complianceRequirementTemplates.projectId, query.projectId),
          isNull(complianceRequirementTemplates.deletedAt),
        ),
      )
      .orderBy(desc(complianceRequirementTemplates.createdAt));
  },

  async createComplianceTemplate(request: Request) {
    const { orgId, userId } = requireContext(request);
    const body = createComplianceTemplateSchema.parse(
      readValidatedBody(request),
    );

    const [record] = await db
      .insert(complianceRequirementTemplates)
      .values({
        organizationId: orgId,
        projectId: body.projectId,
        name: body.name,
        complianceType: body.complianceType,
        defaultDueDays: body.defaultDueDays,
        required: body.required ?? true,
        highRisk: body.highRisk ?? false,
        metadata: body.metadata ?? null,
        createdByUserId: userId,
      })
      .returning();

    return record;
  },

  async updateComplianceTemplate(request: Request) {
    const { orgId } = requireContext(request);
    const params = complianceTemplateIdParamsSchema.parse(
      readValidatedParams(request),
    );
    const body = updateComplianceTemplateSchema.parse(
      readValidatedBody(request),
    );

    const [record] = await db
      .update(complianceRequirementTemplates)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(complianceRequirementTemplates.id, params.templateId),
          eq(complianceRequirementTemplates.organizationId, orgId),
          isNull(complianceRequirementTemplates.deletedAt),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Compliance template not found");
    }

    return record;
  },

  async archiveComplianceTemplate(request: Request) {
    const { orgId } = requireContext(request);
    const params = complianceTemplateIdParamsSchema.parse(
      readValidatedParams(request),
    );

    const [record] = await db
      .update(complianceRequirementTemplates)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(complianceRequirementTemplates.id, params.templateId),
          eq(complianceRequirementTemplates.organizationId, orgId),
          isNull(complianceRequirementTemplates.deletedAt),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Compliance template not found");
    }

    return record;
  },

  async applyComplianceTemplates(request: Request) {
    const { orgId } = requireContext(request);
    const body = applyComplianceTemplatesSchema.parse(
      readValidatedBody(request),
    );

    await ensureSubcontractor(orgId, body.subcontractorId);

    const result = await applyComplianceTemplatesForSubcontractor({
      organizationId: orgId,
      projectId: body.projectId,
      subcontractorId: body.subcontractorId,
      dueDateOverride: body.dueDateOverride
        ? new Date(body.dueDateOverride)
        : undefined,
    });

    return {
      ...result,
      projectId: body.projectId,
      subcontractorId: body.subcontractorId,
    };
  },

  async listPayApplications(request: Request) {
    const { orgId } = requireContext(request);
    const query = listInternalPayApplicationsQuerySchema.parse(
      readValidatedQuery(request),
    );

    const filters = [
      eq(payApplications.organizationId, orgId),
      isNull(payApplications.deletedAt),
    ];

    if (query.projectId) {
      filters.push(eq(payApplications.projectId, query.projectId));
    }
    if (query.subcontractorId) {
      filters.push(eq(payApplications.subcontractorId, query.subcontractorId));
    }
    if (query.status) {
      filters.push(eq(payApplications.status, query.status));
    }

    return await db
      .select()
      .from(payApplications)
      .where(and(...filters))
      .orderBy(desc(payApplications.createdAt))
      .limit(query.limit);
  },

  async getPayApplication(request: Request) {
    const { orgId } = requireContext(request);
    const params = payApplicationIdParamsSchema.parse(
      readValidatedParams(request),
    );

    const [record] = await db
      .select()
      .from(payApplications)
      .where(
        and(
          eq(payApplications.id, params.payApplicationId),
          eq(payApplications.organizationId, orgId),
          isNull(payApplications.deletedAt),
        ),
      )
      .limit(1);

    if (!record) {
      throw notFound("Pay application not found");
    }

    const [lineItems, timeline] = await Promise.all([
      db
        .select()
        .from(payApplicationLineItems)
        .where(eq(payApplicationLineItems.payApplicationId, record.id))
        .orderBy(desc(payApplicationLineItems.createdAt)),
      db
        .select()
        .from(payApplicationStatusEvents)
        .where(eq(payApplicationStatusEvents.payApplicationId, record.id))
        .orderBy(desc(payApplicationStatusEvents.createdAt)),
    ]);

    return {
      ...record,
      lineItems,
      timeline,
    };
  },

  async reviewPayApplication(request: Request) {
    const { orgId, userId } = requireContext(request);
    const params = payApplicationIdParamsSchema.parse(
      readValidatedParams(request),
    );
    const body = reviewPayApplicationSchema.parse(readValidatedBody(request));

    const [current] = await db
      .select()
      .from(payApplications)
      .where(
        and(
          eq(payApplications.id, params.payApplicationId),
          eq(payApplications.organizationId, orgId),
          isNull(payApplications.deletedAt),
        ),
      )
      .limit(1);

    if (!current) {
      throw notFound("Pay application not found");
    }

    if (current.status === "paid") {
      throw badRequest("Paid applications cannot be changed");
    }

    const [updated] = await db
      .update(payApplications)
      .set({
        status: body.status,
        rejectionReason:
          body.status === "rejected" ? (body.reason ?? null) : null,
        reviewedAt: new Date(),
        reviewerUserId: userId,
        metadata: {
          ...(current.metadata ?? {}),
          reviewerNotes: body.reviewerNotes ?? null,
          lastReviewAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(payApplications.id, current.id))
      .returning();

    await db.insert(payApplicationStatusEvents).values({
      payApplicationId: current.id,
      organizationId: current.organizationId,
      projectId: current.projectId,
      subcontractorId: current.subcontractorId,
      status: body.status,
      actorType: "reviewer",
      actorId: userId,
      reason: body.reason ?? body.reviewerNotes ?? null,
      metadata: body.metadata ?? null,
    });

    return updated;
  },

  async listDailyLogs(request: Request) {
    const { orgId } = requireContext(request);
    const query = listInternalDailyLogsQuerySchema.parse(
      readValidatedQuery(request),
    );

    const filters = [
      eq(dailyLogs.organizationId, orgId),
      isNull(dailyLogs.deletedAt),
    ];
    if (query.projectId) {
      filters.push(eq(dailyLogs.projectId, query.projectId));
    }
    if (query.subcontractorId) {
      filters.push(eq(dailyLogs.subcontractorId, query.subcontractorId));
    }
    if (query.reviewStatus) {
      filters.push(eq(dailyLogs.reviewStatus, query.reviewStatus));
    }

    return await db
      .select()
      .from(dailyLogs)
      .where(and(...filters))
      .orderBy(desc(dailyLogs.logDate), desc(dailyLogs.createdAt))
      .limit(query.limit);
  },

  async getDailyLog(request: Request) {
    const { orgId } = requireContext(request);
    const params = dailyLogIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .select()
      .from(dailyLogs)
      .where(
        and(
          eq(dailyLogs.id, params.dailyLogId),
          eq(dailyLogs.organizationId, orgId),
          isNull(dailyLogs.deletedAt),
        ),
      )
      .limit(1);

    if (!record) {
      throw notFound("Daily log not found");
    }

    const timeline = await db
      .select()
      .from(dailyLogStatusEvents)
      .where(eq(dailyLogStatusEvents.dailyLogId, record.id))
      .orderBy(desc(dailyLogStatusEvents.createdAt));

    return {
      ...record,
      timeline,
    };
  },

  async reviewDailyLog(request: Request) {
    const { orgId, userId } = requireContext(request);
    const params = dailyLogIdParamsSchema.parse(readValidatedParams(request));
    const body = reviewDailyLogSchema.parse(readValidatedBody(request));

    const [current] = await db
      .select()
      .from(dailyLogs)
      .where(
        and(
          eq(dailyLogs.id, params.dailyLogId),
          eq(dailyLogs.organizationId, orgId),
          isNull(dailyLogs.deletedAt),
        ),
      )
      .limit(1);

    if (!current) {
      throw notFound("Daily log not found");
    }

    const [updated] = await db
      .update(dailyLogs)
      .set({
        reviewStatus: body.reviewStatus,
        reviewNotes: body.reviewNotes ?? null,
        reviewerUserId: userId,
        reviewedAt: new Date(),
        metadata: {
          ...(current.metadata ?? {}),
          lastReviewAt: new Date().toISOString(),
          ...(body.metadata ?? {}),
        },
        updatedAt: new Date(),
      })
      .where(eq(dailyLogs.id, current.id))
      .returning();

    await db.insert(dailyLogStatusEvents).values({
      dailyLogId: current.id,
      organizationId: current.organizationId,
      projectId: current.projectId,
      subcontractorId: current.subcontractorId,
      status: body.reviewStatus,
      actorType: "reviewer",
      actorId: userId,
      reason: body.reviewNotes ?? null,
      metadata: body.metadata ?? null,
    });

    return updated;
  },
};
