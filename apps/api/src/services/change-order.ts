import { budgetCostCodes, changeOrders, fileAssets, projects } from "@foreman/db";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Request } from "express";
import { env } from "../config/env";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  changeOrderAttachmentParamsSchema,
  changeOrderIdParamsSchema,
  createChangeOrderSchema,
  decisionChangeOrderSchema,
  listChangeOrdersQuerySchema,
  updateChangeOrderSchema,
} from "../schemas/change-order.schema";
import { eventService } from "./events";

const FINAL_STATUSES = new Set(["approved", "rejected", "closed"] as const);

type DecisionStatus = "approved" | "rejected" | "revision_requested" | "closed";

type ChangeOrderMetadata = Record<string, unknown>;

interface RoutingPolicy {
  approvalStages: string[];
  stageSlaHours: Record<string, number>;
}

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

function toMetadata(raw: unknown): ChangeOrderMetadata {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

function parseApprovalStagesFromEnv() {
  const configured = env.CHANGE_ORDER_APPROVAL_STAGES
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (configured && configured.length > 0) {
    return configured;
  }

  return ["pm_review", "finance_review"];
}

function parseStageSlaHoursFromEnv() {
  const output: Record<string, number> = {};
  const configured = env.CHANGE_ORDER_STAGE_SLA_HOURS;

  if (!configured) {
    return output;
  }

  for (const token of configured.split(",")) {
    const [rawStage, rawHours] = token.split(":").map((value) => value.trim());
    if (!rawStage || !rawHours) {
      continue;
    }

    const hours = Number(rawHours);
    if (!Number.isFinite(hours) || hours <= 0) {
      continue;
    }

    output[rawStage] = Math.round(hours);
  }

  return output;
}

function resolveRoutingPolicy(metadata: ChangeOrderMetadata, override?: unknown): RoutingPolicy {
  const baseFromMetadata =
    metadata.routingPolicy && typeof metadata.routingPolicy === "object"
      ? (metadata.routingPolicy as Record<string, unknown>)
      : null;

  const approvalStagesFromOverride =
    override && typeof override === "object" && Array.isArray((override as Record<string, unknown>).approvalStages)
      ? ((override as Record<string, unknown>).approvalStages as unknown[])
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter(Boolean)
      : [];

  const approvalStagesFromMetadata = baseFromMetadata && Array.isArray(baseFromMetadata.approvalStages)
    ? (baseFromMetadata.approvalStages as unknown[])
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    : [];

  const approvalStages =
    approvalStagesFromOverride.length > 0
      ? approvalStagesFromOverride
      : approvalStagesFromMetadata.length > 0
        ? approvalStagesFromMetadata
        : parseApprovalStagesFromEnv();

  const stageSlaHours: Record<string, number> = {
    ...parseStageSlaHoursFromEnv(),
  };

  if (baseFromMetadata?.stageSlaHours && typeof baseFromMetadata.stageSlaHours === "object") {
    for (const [stage, rawHours] of Object.entries(baseFromMetadata.stageSlaHours as Record<string, unknown>)) {
      const hours = Number(rawHours);
      if (Number.isFinite(hours) && hours > 0) {
        stageSlaHours[stage] = Math.round(hours);
      }
    }
  }

  if (override && typeof override === "object") {
    const rawStageSlaHours = (override as Record<string, unknown>).stageSlaHours;
    if (rawStageSlaHours && typeof rawStageSlaHours === "object") {
      for (const [stage, rawHours] of Object.entries(rawStageSlaHours as Record<string, unknown>)) {
        const hours = Number(rawHours);
        if (Number.isFinite(hours) && hours > 0) {
          stageSlaHours[stage] = Math.round(hours);
        }
      }
    }
  }

  return {
    approvalStages,
    stageSlaHours,
  };
}

function buildDecisionHistoryEntry(input: {
  stage: string;
  decision: string;
  actorUserId: string;
  comment?: string;
}) {
  return {
    stage: input.stage,
    decision: input.decision,
    actorUserId: input.actorUserId,
    comment: input.comment ?? null,
    at: new Date().toISOString(),
  };
}

function computeStageDeadline(stage: string, policy: RoutingPolicy, from: Date) {
  const defaultHours = env.CHANGE_ORDER_DEFAULT_STAGE_SLA_HOURS ?? 48;
  const stageHours = policy.stageSlaHours[stage] ?? defaultHours;

  const deadline = new Date(from);
  deadline.setUTCHours(deadline.getUTCHours() + stageHours);
  return deadline;
}

function resolveCurrentStageIndex(record: typeof changeOrders.$inferSelect, policy: RoutingPolicy, metadata: ChangeOrderMetadata) {
  const approvalFlow =
    metadata.approvalFlow && typeof metadata.approvalFlow === "object"
      ? (metadata.approvalFlow as Record<string, unknown>)
      : null;

  const fromMetadata = approvalFlow?.currentStageIndex;
  if (typeof fromMetadata === "number" && Number.isInteger(fromMetadata) && fromMetadata >= 0) {
    return Math.min(fromMetadata, Math.max(0, policy.approvalStages.length - 1));
  }

  const fromPipeline = policy.approvalStages.findIndex((stage) => stage === record.pipelineStage);
  return fromPipeline >= 0 ? fromPipeline : 0;
}

function extractCostCodeId(metadata: ChangeOrderMetadata) {
  const candidates = [metadata.costCodeId, metadata.budgetCostCodeId, metadata.cost_code_id];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

async function applyFinalApprovalHooks(input: {
  orgId: string;
  record: typeof changeOrders.$inferSelect;
}) {
  const hookAppliedAt = new Date().toISOString();
  const hooks: Record<string, unknown> = {
    appliedAt: hookAppliedAt,
    budgetCommittedApplied: false,
    projectScheduleApplied: false,
  };

  const costCodeId = extractCostCodeId(toMetadata(input.record.metadata));
  if (costCodeId && input.record.impactCostCents > 0) {
    const [budgetUpdate] = await db
      .update(budgetCostCodes)
      .set({
        committedCents: sql`${budgetCostCodes.committedCents} + ${input.record.impactCostCents}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(budgetCostCodes.id, costCodeId),
          eq(budgetCostCodes.organizationId, input.orgId),
          eq(budgetCostCodes.projectId, input.record.projectId),
        ),
      )
      .returning({
        id: budgetCostCodes.id,
        committedCents: budgetCostCodes.committedCents,
      });

    if (budgetUpdate) {
      hooks.budgetCommittedApplied = true;
      hooks.budgetCostCodeId = budgetUpdate.id;
      hooks.newCommittedCents = budgetUpdate.committedCents;
    }
  }

  if (input.record.impactDays > 0) {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, input.record.projectId), eq(projects.organizationId, input.orgId)))
      .limit(1);

    if (project) {
      const baseEndDate = project.endDate ?? new Date();
      const updatedEndDate = new Date(baseEndDate);
      updatedEndDate.setUTCDate(updatedEndDate.getUTCDate() + input.record.impactDays);

      await db
        .update(projects)
        .set({
          endDate: updatedEndDate,
          updatedAt: new Date(),
        })
        .where(and(eq(projects.id, project.id), eq(projects.organizationId, input.orgId)));

      hooks.projectScheduleApplied = true;
      hooks.projectId = project.id;
      hooks.newProjectEndDate = updatedEndDate.toISOString();
    }
  }

  return hooks;
}

async function loadChangeOrderOrThrow(orgId: string, changeOrderId: string) {
  const [record] = await db
    .select()
    .from(changeOrders)
    .where(and(eq(changeOrders.id, changeOrderId), eq(changeOrders.organizationId, orgId)))
    .limit(1);

  if (!record) {
    throw notFound("Change order not found");
  }

  return record;
}

export const changeOrderService = {
  async list(request: Request) {
    const { orgId } = requireContext(request);
    const query = listChangeOrdersQuerySchema.parse(readValidatedQuery(request));

    return await db
      .select()
      .from(changeOrders)
      .where(and(eq(changeOrders.organizationId, orgId), eq(changeOrders.projectId, query.projectId)));
  },

  async create(request: Request) {
    const { orgId, userId } = requireContext(request);
    const body = createChangeOrderSchema.parse(readValidatedBody(request));

    const baseMetadata = toMetadata(body.metadata);
    const routingPolicy = resolveRoutingPolicy(baseMetadata, body.routingPolicy);

    const [record] = await db
      .insert(changeOrders)
      .values({
        organizationId: orgId,
        projectId: body.projectId,
        title: body.title,
        reason: body.reason,
        impactCostCents: body.impactCostCents,
        impactDays: body.impactDays,
        deadlineAt: body.deadlineAt ? new Date(body.deadlineAt) : undefined,
        createdByUserId: userId,
        metadata: {
          ...baseMetadata,
          routingPolicy,
        },
      })
      .returning();

    return record;
  },

  async get(request: Request) {
    const { orgId } = requireContext(request);
    const params = changeOrderIdParamsSchema.parse(readValidatedParams(request));

    return await loadChangeOrderOrThrow(orgId, params.changeOrderId);
  },

  async update(request: Request) {
    const { orgId } = requireContext(request);
    const params = changeOrderIdParamsSchema.parse(readValidatedParams(request));
    const body = updateChangeOrderSchema.parse(readValidatedBody(request));

    const existing = await loadChangeOrderOrThrow(orgId, params.changeOrderId);
    const existingMetadata = toMetadata(existing.metadata);
    const mergedMetadata = {
      ...existingMetadata,
      ...toMetadata(body.metadata),
    };

    const routingPolicy = resolveRoutingPolicy(mergedMetadata, body.routingPolicy);

    const [record] = await db
      .update(changeOrders)
      .set({
        title: body.title,
        reason: body.reason,
        impactCostCents: body.impactCostCents,
        impactDays: body.impactDays,
        status: body.status,
        pipelineStage: body.pipelineStage,
        deadlineAt: body.deadlineAt ? new Date(body.deadlineAt) : undefined,
        metadata: {
          ...mergedMetadata,
          routingPolicy,
        },
        updatedAt: new Date(),
      })
      .where(and(eq(changeOrders.id, params.changeOrderId), eq(changeOrders.organizationId, orgId)))
      .returning();

    if (!record) {
      throw notFound("Change order not found");
    }

    return record;
  },

  async submit(request: Request) {
    const { orgId, userId } = requireContext(request);
    const params = changeOrderIdParamsSchema.parse(readValidatedParams(request));

    const existing = await loadChangeOrderOrThrow(orgId, params.changeOrderId);
    if (!["draft", "revision_requested"].includes(existing.status)) {
      throw badRequest("Only draft or revision requested change orders can be submitted");
    }

    const now = new Date();
    const metadata = toMetadata(existing.metadata);
    const routingPolicy = resolveRoutingPolicy(metadata);
    const firstStage = routingPolicy.approvalStages[0];

    if (!firstStage) {
      throw badRequest("Routing policy must define at least one approval stage");
    }

    const updatedMetadata: ChangeOrderMetadata = {
      ...metadata,
      routingPolicy,
      approvalFlow: {
        currentStageIndex: 0,
        history: [
          {
            stage: firstStage,
            decision: "submitted",
            actorUserId: userId,
            at: now.toISOString(),
          },
        ],
      },
    };

    const [record] = await db
      .update(changeOrders)
      .set({
        status: "submitted",
        pipelineStage: firstStage,
        submittedAt: now,
        resolvedAt: null,
        deadlineAt: computeStageDeadline(firstStage, routingPolicy, now),
        metadata: updatedMetadata,
        updatedAt: now,
      })
      .where(and(eq(changeOrders.id, params.changeOrderId), eq(changeOrders.organizationId, orgId)))
      .returning();

    if (!record) {
      throw notFound("Change order not found");
    }

    await eventService.emit({
      event: "change_order.submitted",
      organizationId: orgId,
      title: "Change Order Submitted",
      message: `Change order "${record.title}" has been submitted to stage ${firstStage}.`,
      metadata: {
        changeOrderId: record.id,
        pipelineStage: firstStage,
        impactCost: record.impactCostCents,
        impactDays: record.impactDays,
      },
    });

    return record;
  },

  async decide(request: Request) {
    const { orgId, userId } = requireContext(request);
    const params = changeOrderIdParamsSchema.parse(readValidatedParams(request));
    const body = decisionChangeOrderSchema.parse(readValidatedBody(request));

    const existing = await loadChangeOrderOrThrow(orgId, params.changeOrderId);
    if (!["submitted", "under_review"].includes(existing.status)) {
      throw badRequest("Only submitted or under-review change orders can be decided");
    }

    const now = new Date();
    const metadata = toMetadata(existing.metadata);
    const routingPolicy = resolveRoutingPolicy(metadata);
    const currentStageIndex = resolveCurrentStageIndex(existing, routingPolicy, metadata);
    const currentStage = routingPolicy.approvalStages[currentStageIndex] ?? existing.pipelineStage;

    const approvalFlow =
      metadata.approvalFlow && typeof metadata.approvalFlow === "object"
        ? (metadata.approvalFlow as Record<string, unknown>)
        : {};

    const existingHistory = Array.isArray(approvalFlow.history)
      ? (approvalFlow.history as unknown[])
      : [];

    const nextHistory = [
      ...existingHistory,
      buildDecisionHistoryEntry({
        stage: currentStage,
        decision: body.status,
        actorUserId: userId,
        comment: body.comment,
      }),
    ];

    if (body.status === "approved") {
      const hasNextStage = currentStageIndex < routingPolicy.approvalStages.length - 1;

      if (hasNextStage) {
        const nextStage = routingPolicy.approvalStages[currentStageIndex + 1];
        const [advanced] = await db
          .update(changeOrders)
          .set({
            status: "under_review",
            pipelineStage: nextStage,
            deadlineAt: computeStageDeadline(nextStage, routingPolicy, now),
            metadata: {
              ...metadata,
              routingPolicy,
              approvalFlow: {
                ...approvalFlow,
                currentStageIndex: currentStageIndex + 1,
                history: nextHistory,
              },
            },
            updatedAt: now,
          })
          .where(and(eq(changeOrders.id, params.changeOrderId), eq(changeOrders.organizationId, orgId)))
          .returning();

        if (!advanced) {
          throw notFound("Change order not found");
        }

        await eventService.emit({
          event: "change_order.submitted",
          organizationId: orgId,
          title: "Change Order Advanced",
          message: `Change order "${advanced.title}" advanced to stage ${nextStage}.`,
          metadata: {
            changeOrderId: advanced.id,
            previousStage: currentStage,
            nextStage,
          },
        });

        return advanced;
      }

      const [approved] = await db
        .update(changeOrders)
        .set({
          status: "approved",
          pipelineStage: "approved",
          decidedByUserId: userId,
          resolvedAt: now,
          deadlineAt: null,
          metadata: {
            ...metadata,
            routingPolicy,
            approvalFlow: {
              ...approvalFlow,
              currentStageIndex,
              history: nextHistory,
            },
          },
          updatedAt: now,
        })
        .where(and(eq(changeOrders.id, params.changeOrderId), eq(changeOrders.organizationId, orgId)))
        .returning();

      if (!approved) {
        throw notFound("Change order not found");
      }

      const hooks = await applyFinalApprovalHooks({
        orgId,
        record: approved,
      });

      const [finalRecord] = await db
        .update(changeOrders)
        .set({
          metadata: {
            ...toMetadata(approved.metadata),
            hooks,
          },
          updatedAt: new Date(),
        })
        .where(and(eq(changeOrders.id, approved.id), eq(changeOrders.organizationId, orgId)))
        .returning();

      await eventService.emit({
        event: "change_order.approved",
        organizationId: orgId,
        userId,
        title: "Change Order Approved",
        message: `Change order "${approved.title}" has been fully approved.`,
        metadata: {
          changeOrderId: approved.id,
          impactCost: approved.impactCostCents,
          impactDays: approved.impactDays,
          hooks,
        },
      });

      return finalRecord ?? approved;
    }

    const finalStatus = body.status as DecisionStatus;
    const shouldSetDecider = finalStatus === "rejected" || finalStatus === "closed";

    const [record] = await db
      .update(changeOrders)
      .set({
        status: finalStatus,
        pipelineStage: finalStatus,
        decidedByUserId: shouldSetDecider ? userId : existing.decidedByUserId,
        resolvedAt: finalStatus === "revision_requested" ? null : now,
        deadlineAt: finalStatus === "revision_requested" ? null : existing.deadlineAt,
        metadata: {
          ...metadata,
          routingPolicy,
          approvalFlow: {
            ...approvalFlow,
            currentStageIndex,
            history: nextHistory,
          },
        },
        updatedAt: now,
      })
      .where(and(eq(changeOrders.id, params.changeOrderId), eq(changeOrders.organizationId, orgId)))
      .returning();

    if (!record) {
      throw notFound("Change order not found");
    }

    if (finalStatus === "rejected") {
      await eventService.emit({
        event: "change_order.rejected",
        organizationId: orgId,
        userId,
        title: "Change Order Rejected",
        message: `Change order "${record.title}" has been rejected.`,
        metadata: {
          changeOrderId: record.id,
          stage: currentStage,
          comment: body.comment,
        },
      });
    }

    return record;
  },

  async listAttachments(request: Request) {
    const { orgId } = requireContext(request);
    const params = changeOrderIdParamsSchema.parse(readValidatedParams(request));

    await loadChangeOrderOrThrow(orgId, params.changeOrderId);

    return await db
      .select()
      .from(fileAssets)
      .where(
        and(
          eq(fileAssets.organizationId, orgId),
          eq(fileAssets.entityType, "change_order_attachment"),
          eq(fileAssets.entityId, params.changeOrderId),
          isNull(fileAssets.deletedAt),
        ),
      );
  },

  async attachFileAsset(request: Request) {
    const { orgId } = requireContext(request);
    const params = changeOrderAttachmentParamsSchema.parse(readValidatedParams(request));

    const record = await loadChangeOrderOrThrow(orgId, params.changeOrderId);

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

    if (!asset) {
      throw notFound("File asset not found");
    }

    if (asset.status !== "uploaded") {
      throw badRequest("Only uploaded file assets can be attached");
    }

    const [updated] = await db
      .update(fileAssets)
      .set({
        entityType: "change_order_attachment",
        entityId: record.id,
        projectId: record.projectId,
        updatedAt: new Date(),
      })
      .where(and(eq(fileAssets.id, asset.id), eq(fileAssets.organizationId, orgId), isNull(fileAssets.deletedAt)))
      .returning();

    if (!updated) {
      throw notFound("File asset not found");
    }

    return updated;
  },

  async detachFileAsset(request: Request) {
    const { orgId } = requireContext(request);
    const params = changeOrderAttachmentParamsSchema.parse(readValidatedParams(request));

    await loadChangeOrderOrThrow(orgId, params.changeOrderId);

    const [updated] = await db
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
          eq(fileAssets.entityType, "change_order_attachment"),
          eq(fileAssets.entityId, params.changeOrderId),
          isNull(fileAssets.deletedAt),
        ),
      )
      .returning();

    if (!updated) {
      throw notFound("Attachment not found");
    }

    return updated;
  },
};
