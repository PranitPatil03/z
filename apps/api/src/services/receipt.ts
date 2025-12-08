import { and, eq, isNull } from "drizzle-orm";
import { receipts } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import { createReceiptSchema, receiptIdParamsSchema, updateReceiptSchema } from "../schemas/receipt.schema";

function readValidatedBody<T>(request: Request) {
  return (request as ValidatedRequest).validated?.body as T;
}

function readValidatedParams<T>(request: Request) {
  return (request as ValidatedRequest).validated?.params as T;
}

function requireOrg(request: Request) {
  const { session } = getAuthContext(request);
  if (!session.activeOrganizationId) {
    throw badRequest("An active organization is required");
  }
  return session.activeOrganizationId;
}

export const receiptService = {
  async list(request: Request) {
    const orgId = requireOrg(request);
    return await db.select().from(receipts).where(and(eq(receipts.organizationId, orgId), isNull(receipts.deletedAt)));
  },

  async create(request: Request) {
    const orgId = requireOrg(request);
    const body = createReceiptSchema.parse(readValidatedBody(request));

    const [record] = await db
      .insert(receipts)
      .values({
        organizationId: orgId,
        projectId: body.projectId,
        purchaseOrderId: body.purchaseOrderId ?? null,
        receiptNumber: body.receiptNumber,
        receivedAmountCents: body.receivedAmountCents,
        status: "received",
        receivedAt: body.receivedAt ? new Date(body.receivedAt) : new Date(),
        notes: body.notes ?? null,
      })
      .returning();

    return record;
  },

  async get(request: Request) {
    const orgId = requireOrg(request);
    const params = receiptIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .select()
      .from(receipts)
      .where(and(eq(receipts.id, params.receiptId), eq(receipts.organizationId, orgId), isNull(receipts.deletedAt)));

    if (!record) {
      throw notFound("Receipt not found");
    }

    return record;
  },

  async update(request: Request) {
    const orgId = requireOrg(request);
    const params = receiptIdParamsSchema.parse(readValidatedParams(request));
    const body = updateReceiptSchema.parse(readValidatedBody(request));

    const [record] = await db
      .update(receipts)
      .set({
        ...body,
        receivedAt: body.receivedAt === undefined || body.receivedAt === null ? undefined : new Date(body.receivedAt),
        updatedAt: new Date(),
      })
      .where(and(eq(receipts.id, params.receiptId), eq(receipts.organizationId, orgId), isNull(receipts.deletedAt)))
      .returning();

    if (!record) {
      throw notFound("Receipt not found");
    }

    return record;
  },

  async archive(request: Request) {
    const orgId = requireOrg(request);
    const params = receiptIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .update(receipts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(receipts.id, params.receiptId), eq(receipts.organizationId, orgId), isNull(receipts.deletedAt)))
      .returning();

    if (!record) {
      throw notFound("Receipt not found");
    }

    return record;
  },
};
