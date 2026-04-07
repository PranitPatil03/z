import { and, eq, isNull } from "drizzle-orm";
import { auditLogs, billingRecords } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import { eventService } from "./events";
import { entitlementsService, getDefaultsForPlan } from "./entitlements";
import {
  billingRecordIdParamsSchema,
  createBillingRecordSchema,
  updateSubscriptionPlanSchema,
  updateBillingRecordSchema,
} from "../schemas/billing.schema";

function readValidatedBody<T>(request: Request) {
  return (request as ValidatedRequest).validated?.body as T;
}

function readValidatedParams<T>(request: Request) {
  return (request as ValidatedRequest).validated?.params as T;
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

export const billingService = {
  async list(request: Request) {
    const { orgId } = requireContext(request);
    return await db
      .select()
      .from(billingRecords)
      .where(and(eq(billingRecords.organizationId, orgId), isNull(billingRecords.deletedAt)));
  },

  async create(request: Request) {
    const { orgId, userId } = requireContext(request);
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

    await db.insert(auditLogs).values({
      organizationId: orgId,
      actorUserId: userId,
      entityType: "billing_record",
      entityId: record.id,
      action: "create",
      beforeData: null,
      afterData: {
        status: record.status,
        amountCents: record.amountCents,
        currency: record.currency,
      },
      metadata: {
        projectId: record.projectId,
      },
    });

    return record;
  },

  async get(request: Request) {
    const { orgId } = requireContext(request);
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
    const { orgId, userId } = requireContext(request);
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

    await db.insert(auditLogs).values({
      organizationId: orgId,
      actorUserId: userId,
      entityType: "billing_record",
      entityId: record.id,
      action: oldRecord?.status !== record.status && record.status === "paid" ? "approve" : "update",
      beforeData: oldRecord
        ? {
            status: oldRecord.status,
            amountCents: oldRecord.amountCents,
            dueDate: oldRecord.dueDate,
          }
        : null,
      afterData: {
        status: record.status,
        amountCents: record.amountCents,
        dueDate: record.dueDate,
      },
      metadata: {
        projectId: record.projectId,
      },
    });

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
      } else if (oldRecord?.status === "issued" && record.status === "draft") {
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
    const { orgId, userId } = requireContext(request);
    const params = billingRecordIdParamsSchema.parse(readValidatedParams(request));

    const [existing] = await db
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

    if (!existing) {
      throw notFound("Billing record not found");
    }

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

    await db.insert(auditLogs).values({
      organizationId: orgId,
      actorUserId: userId,
      entityType: "billing_record",
      entityId: record.id,
      action: "archive",
      beforeData: {
        status: existing.status,
      },
      afterData: {
        status: record.status,
      },
      metadata: {
        projectId: record.projectId,
      },
    });

    return record;
  },

  async usage(request: Request) {
    const { orgId } = requireContext(request);
    return await entitlementsService.getUsageSummary(orgId);
  },

  async plans() {
    const plans = ["starter", "growth", "enterprise"] as const;
    return plans.map((plan) => ({
      plan,
      ...getDefaultsForPlan(plan),
    }));
  },

  async changePlan(request: Request) {
    const { orgId, userId } = requireContext(request);
    const body = updateSubscriptionPlanSchema.parse(readValidatedBody(request));

    const result = await entitlementsService.changePlan(orgId, body.plan);

    await db.insert(auditLogs).values({
      organizationId: orgId,
      actorUserId: userId,
      entityType: "organization_subscription",
      entityId: result.subscription.id,
      action: "update",
      beforeData: {
        plan: result.previousPlan,
      },
      afterData: {
        plan: result.subscription.plan,
        aiCreditsIncluded: result.subscription.aiCreditsIncluded,
        allowOverage: result.subscription.allowOverage,
        overagePriceCents: result.subscription.overagePriceCents,
      },
      metadata: {
        reason: body.reason ?? null,
      },
    });

    return result;
  },
};
