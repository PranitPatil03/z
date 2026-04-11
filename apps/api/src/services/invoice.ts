import { auditLogs, invoices, matchRuns, members } from "@foreman/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, forbidden, notFound } from "../lib/errors";
import { buildCursorPagination, paginatedResponse } from "../lib/pagination";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  createInvoiceSchema,
  invoiceIdParamsSchema,
  listInvoicesQuerySchema,
  updateInvoiceSchema,
} from "../schemas/invoice.schema";

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

async function ensurePayableTransitionAllowed(input: {
  orgId: string;
  userId: string;
  invoiceId: string;
  allowPayOverride?: boolean;
  payOverrideReason?: string;
}) {
  const [latestMatchRun] = await db
    .select({ id: matchRuns.id, result: matchRuns.result })
    .from(matchRuns)
    .where(
      and(
        eq(matchRuns.organizationId, input.orgId),
        eq(matchRuns.invoiceId, input.invoiceId),
      ),
    )
    .orderBy(desc(matchRuns.createdAt))
    .limit(1);

  if (latestMatchRun?.result === "matched") {
    return {
      overrideUsed: false,
      matchRunId: latestMatchRun.id,
      payOverrideReason: null as string | null,
    };
  }

  if (!input.allowPayOverride) {
    throw badRequest(
      "Invoice cannot be marked paid without a matched 3-way run or authorized override",
    );
  }

  if (!input.payOverrideReason) {
    throw badRequest(
      "payOverrideReason is required when overriding payable gate",
    );
  }

  const [membership] = await db
    .select({ role: members.role })
    .from(members)
    .where(
      and(
        eq(members.organizationId, input.orgId),
        eq(members.userId, input.userId),
      ),
    )
    .limit(1);

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    throw forbidden("Only owner/admin can override invoice payable gate");
  }

  return {
    overrideUsed: true,
    matchRunId: latestMatchRun?.id ?? null,
    payOverrideReason: input.payOverrideReason,
  };
}

export const invoiceService = {
  async list(request: Request) {
    const { orgId } = requireContext(request);
    const query = listInvoicesQuerySchema.parse(
      (request as ValidatedRequest).validated?.query || request.query,
    );

    const conditions = [
      eq(invoices.organizationId, orgId),
      isNull(invoices.deletedAt),
    ];
    if (query.projectId)
      conditions.push(eq(invoices.projectId, query.projectId));
    if (query.status) conditions.push(eq(invoices.status, query.status));

    const { cursorCondition, orderBy, limit } = buildCursorPagination(
      invoices.id,
      query,
    );
    if (cursorCondition) conditions.push(cursorCondition);

    const items = await db
      .select()
      .from(invoices)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit);

    return paginatedResponse(items, limit);
  },

  async create(request: Request) {
    const { orgId, userId } = requireContext(request);
    const body = createInvoiceSchema.parse(readValidatedBody(request));

    const [record] = await db
      .insert(invoices)
      .values({
        organizationId: orgId,
        projectId: body.projectId,
        purchaseOrderId: body.purchaseOrderId ?? null,
        invoiceNumber: body.invoiceNumber,
        vendorName: body.vendorName,
        currency: body.currency,
        totalAmountCents: body.totalAmountCents,
        status: "submitted",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      })
      .returning();

    await db.insert(auditLogs).values({
      organizationId: orgId,
      actorUserId: userId,
      entityType: "invoice",
      entityId: record.id,
      action: "create",
      beforeData: null,
      afterData: {
        status: record.status,
        totalAmountCents: record.totalAmountCents,
        projectId: record.projectId,
      },
      metadata: {
        projectId: record.projectId,
      },
    });

    return record;
  },

  async get(request: Request) {
    const { orgId } = requireContext(request);
    const params = invoiceIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.id, params.invoiceId),
          eq(invoices.organizationId, orgId),
          isNull(invoices.deletedAt),
        ),
      );

    if (!record) {
      throw notFound("Invoice not found");
    }

    return record;
  },

  async update(request: Request) {
    const { orgId, userId } = requireContext(request);
    const params = invoiceIdParamsSchema.parse(readValidatedParams(request));
    const body = updateInvoiceSchema.parse(readValidatedBody(request));

    const [existing] = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.id, params.invoiceId),
          eq(invoices.organizationId, orgId),
          isNull(invoices.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      throw notFound("Invoice not found");
    }

    const statusTransitionToPaid =
      body.status === "paid" && existing.status !== "paid";

    const payableGate = statusTransitionToPaid
      ? await ensurePayableTransitionAllowed({
          orgId,
          userId,
          invoiceId: existing.id,
          allowPayOverride: body.allowPayOverride,
          payOverrideReason: body.payOverrideReason,
        })
      : {
          overrideUsed: false,
          matchRunId: null as string | null,
          payOverrideReason: null as string | null,
        };

    const {
      allowPayOverride: _allowPayOverride,
      payOverrideReason: _payOverrideReason,
      ...persistedBody
    } = body;

    const [record] = await db
      .update(invoices)
      .set({
        ...persistedBody,
        dueDate:
          persistedBody.dueDate === undefined
            ? undefined
            : persistedBody.dueDate
              ? new Date(persistedBody.dueDate)
              : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(invoices.id, params.invoiceId),
          eq(invoices.organizationId, orgId),
          isNull(invoices.deletedAt),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Invoice not found");
    }

    const statusChanged = existing.status !== record.status;
    if (
      statusChanged ||
      body.vendorName !== undefined ||
      body.totalAmountCents !== undefined ||
      body.currency !== undefined
    ) {
      await db.insert(auditLogs).values({
        organizationId: orgId,
        actorUserId: userId,
        entityType: "invoice",
        entityId: record.id,
        action: statusTransitionToPaid ? "approve" : "update",
        beforeData: {
          status: existing.status,
          totalAmountCents: existing.totalAmountCents,
          dueDate: existing.dueDate,
        },
        afterData: {
          status: record.status,
          totalAmountCents: record.totalAmountCents,
          dueDate: record.dueDate,
        },
        metadata: {
          projectId: record.projectId,
          payableGateOverrideUsed: payableGate.overrideUsed,
          payableGateOverrideReason: payableGate.payOverrideReason,
          relatedMatchRunId: payableGate.matchRunId,
        },
      });
    }

    return record;
  },

  async archive(request: Request) {
    const { orgId, userId } = requireContext(request);
    const params = invoiceIdParamsSchema.parse(readValidatedParams(request));

    const [existing] = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.id, params.invoiceId),
          eq(invoices.organizationId, orgId),
          isNull(invoices.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      throw notFound("Invoice not found");
    }

    const [record] = await db
      .update(invoices)
      .set({ status: "hold", deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(invoices.id, params.invoiceId),
          eq(invoices.organizationId, orgId),
          isNull(invoices.deletedAt),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Invoice not found");
    }

    await db.insert(auditLogs).values({
      organizationId: orgId,
      actorUserId: userId,
      entityType: "invoice",
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
};
