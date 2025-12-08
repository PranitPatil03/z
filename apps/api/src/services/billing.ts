import { and, eq, isNull } from "drizzle-orm";
import { billingRecords } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import { eventService } from "./events";
import {
  billingRecordIdParamsSchema,
  createBillingRecordSchema,
  updateBillingRecordSchema,
} from "../schemas/billing.schema";

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

export const billingService = {
  async list(request: Request) {
    const orgId = requireOrg(request);
    return await db
      .select()
      .from(billingRecords)
      .where(and(eq(billingRecords.organizationId, orgId), isNull(billingRecords.deletedAt)));
  },

  async create(request: Request) {
    const orgId = requireOrg(request);
    const body = createBillingRecordSchema.parse(readValidatedBody(request));

    const [record] = await db
      .insert(billingRecords)
      .values({
        organizationId: orgId,
        projectId: body.projectId ?? null,
        reference: body.reference,
        amountCents: body.amountCents,
        currency: body.currency,
        status: "draft",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        metadata: body.metadata ?? null,
      })
      .returning();

    return record;
  },

  async get(request: Request) {
    const orgId = requireOrg(request);
    const params = billingRecordIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .select()
      .from(billingRecords)
      .where(
        and(
          eq(billingRecords.id, params.billingRecordId),
          eq(billingRecords.organizationId, orgId),
          isNull(billingRecords.deletedAt),
        ),
      );

    if (!record) {
      throw notFound("Billing record not found");
    }

    return record;
  },

  async update(request: Request) {
    const orgId = requireOrg(request);
    const params = billingRecordIdParamsSchema.parse(readValidatedParams(request));
    const body = updateBillingRecordSchema.parse(readValidatedBody(request));

    const [oldRecord] = await db
      .select()
      .from(billingRecords)
      .where(
        and(
          eq(billingRecords.id, params.billingRecordId),
          eq(billingRecords.organizationId, orgId),
          isNull(billingRecords.deletedAt),
        ),
      )
      .limit(1);

    const [record] = await db
      .update(billingRecords)
      .set({
        ...body,
        dueDate: body.dueDate === undefined ? undefined : body.dueDate ? new Date(body.dueDate) : null,
        paidAt: body.paidAt === undefined ? undefined : body.paidAt ? new Date(body.paidAt) : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(billingRecords.id, params.billingRecordId),
          eq(billingRecords.organizationId, orgId),
          isNull(billingRecords.deletedAt),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Billing record not found");
    }

    // Emit event if status changed
    if (oldRecord?.status !== record.status) {
      if (record.status === "paid") {
        await eventService.emit({
          event: "payment.received",
          organizationId: orgId,
          title: "Payment Received",
          message: `Payment of $${(record.amountCents / 100).toFixed(2)} for ${record.reference} was successfully processed.`,
          metadata: {
            billingRecordId: record.id,
            amount: record.amountCents,
          },
        });
      } else if (record.status === "failed") {
        await eventService.emit({
          event: "payment.failed",
          organizationId: orgId,
          title: "Payment Failed",
          message: `Payment for ${record.reference} failed. Please retry.`,
          metadata: {
            billingRecordId: record.id,
          },
        });
      }
    }

    return record;
  },

  async archive(request: Request) {
    const orgId = requireOrg(request);
    const params = billingRecordIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .update(billingRecords)
      .set({ status: "void", deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(billingRecords.id, params.billingRecordId),
          eq(billingRecords.organizationId, orgId),
          isNull(billingRecords.deletedAt),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Billing record not found");
    }

    return record;
  },
};
