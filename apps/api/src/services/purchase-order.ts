import { and, eq, isNull } from "drizzle-orm";
import { purchaseOrders } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import { createPurchaseOrderSchema, purchaseOrderIdParamsSchema, updatePurchaseOrderSchema } from "../schemas/purchase-order.schema";

function readValidatedBody<T>(request: Request) {
  return (request as ValidatedRequest).validated?.body as T;
}

function readValidatedParams<T>(request: Request) {
  return (request as ValidatedRequest).validated?.params as T;
}

function requireOrg(request: Request) {
  const { session, user } = getAuthContext(request);
  if (!session.activeOrganizationId) {
    throw badRequest("An active organization is required");
  }
  return { orgId: session.activeOrganizationId, userId: user.id };
}

export const purchaseOrderService = {
  async list(request: Request) {
    const { orgId } = requireOrg(request);
    return await db.select().from(purchaseOrders).where(and(eq(purchaseOrders.organizationId, orgId), isNull(purchaseOrders.deletedAt)));
  },

  async create(request: Request) {
    const { orgId, userId } = requireOrg(request);
    const body = createPurchaseOrderSchema.parse(readValidatedBody(request));

    const [record] = await db
      .insert(purchaseOrders)
      .values({
        organizationId: orgId,
        projectId: body.projectId,
        rfqId: body.rfqId ?? null,
        poNumber: body.poNumber,
        vendorName: body.vendorName,
        currency: body.currency,
        totalAmountCents: body.totalAmountCents,
        status: "draft",
        issueDate: body.issueDate ? new Date(body.issueDate) : null,
        createdByUserId: userId,
      })
      .returning();

    return record;
  },

  async get(request: Request) {
    const { orgId } = requireOrg(request);
    const params = purchaseOrderIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, params.purchaseOrderId), eq(purchaseOrders.organizationId, orgId), isNull(purchaseOrders.deletedAt)));

    if (!record) {
      throw notFound("Purchase order not found");
    }

    return record;
  },

  async update(request: Request) {
    const { orgId } = requireOrg(request);
    const params = purchaseOrderIdParamsSchema.parse(readValidatedParams(request));
    const body = updatePurchaseOrderSchema.parse(readValidatedBody(request));

    const [record] = await db
      .update(purchaseOrders)
      .set({
        ...body,
        issueDate: body.issueDate === undefined ? undefined : body.issueDate ? new Date(body.issueDate) : null,
        updatedAt: new Date(),
      })
      .where(and(eq(purchaseOrders.id, params.purchaseOrderId), eq(purchaseOrders.organizationId, orgId), isNull(purchaseOrders.deletedAt)))
      .returning();

    if (!record) {
      throw notFound("Purchase order not found");
    }

    return record;
  },

  async archive(request: Request) {
    const { orgId } = requireOrg(request);
    const params = purchaseOrderIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .update(purchaseOrders)
      .set({ status: "canceled", deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(purchaseOrders.id, params.purchaseOrderId), eq(purchaseOrders.organizationId, orgId), isNull(purchaseOrders.deletedAt)))
      .returning();

    if (!record) {
      throw notFound("Purchase order not found");
    }

    return record;
  },
};
