import { and, eq } from "drizzle-orm";
import { changeOrders } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import { eventService } from "./events";
import {
  changeOrderIdParamsSchema,
  createChangeOrderSchema,
  decisionChangeOrderSchema,
  listChangeOrdersQuerySchema,
  updateChangeOrderSchema,
} from "../schemas/change-order.schema";

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
        metadata: body.metadata,
      })
      .returning();

    return record;
  },

  async get(request: Request) {
    const { orgId } = requireContext(request);
    const params = changeOrderIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .select()
      .from(changeOrders)
      .where(and(eq(changeOrders.id, params.changeOrderId), eq(changeOrders.organizationId, orgId)));

    if (!record) {
      throw notFound("Change order not found");
    }

    return record;
  },

  async update(request: Request) {
    const { orgId } = requireContext(request);
    const params = changeOrderIdParamsSchema.parse(readValidatedParams(request));
    const body = updateChangeOrderSchema.parse(readValidatedBody(request));

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
        metadata: body.metadata,
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
    const { orgId } = requireContext(request);
    const params = changeOrderIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .update(changeOrders)
      .set({
        status: "submitted",
        pipelineStage: "approval",
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(changeOrders.id, params.changeOrderId), eq(changeOrders.organizationId, orgId)))
      .returning();

    if (!record) {
      throw notFound("Change order not found");
    }

    // Emit event
    await eventService.emit({
      event: "change_order.submitted",
      organizationId: orgId,
      title: "Change Order Submitted",
      message: `Change order "${record.title}" has been submitted for approval.`,
      metadata: {
        changeOrderId: record.id,
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

    const [record] = await db
      .update(changeOrders)
      .set({
        status: body.status,
        pipelineStage: body.status,
        decidedByUserId: userId,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(changeOrders.id, params.changeOrderId), eq(changeOrders.organizationId, orgId)))
      .returning();

    // Emit event based on decision
    if (record) {
      if (body.status === "approved") {
        await eventService.emit({
          event: "change_order.approved",
          organizationId: orgId,
          userId,
          title: "Change Order Approved",
          message: `Change order "${record.title}" has been approved.`,
          metadata: {
            changeOrderId: record.id,
            impactCost: record.impactCostCents,
            impactDays: record.impactDays,
          },
        });
      } else if (body.status === "rejected") {
        await eventService.emit({
          event: "change_order.rejected",
          organizationId: orgId,
          userId,
          title: "Change Order Rejected",
          message: `Change order "${record.title}" has been rejected.`,
          metadata: {
            changeOrderId: record.id,
          },
        });
      }
    }

    if (!record) {
      throw notFound("Change order not found");
    }

    return record;
  },
};
