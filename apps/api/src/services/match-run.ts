import { and, eq, isNull } from "drizzle-orm";
import { auditLogs, invoices, matchRuns, purchaseOrders, receipts } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import { createMatchRunSchema, matchRunIdParamsSchema } from "../schemas/match-run.schema";

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
  return { orgId: session.activeOrganizationId, userId: user.id };
}

function computeMatchResult(input: {
  invoiceAmount: number;
  poAmount?: number;
  receiptAmount?: number;
  toleranceBps: number;
}) {
  const poAmount = input.poAmount ?? input.invoiceAmount;
  const receiptAmount = input.receiptAmount ?? poAmount;
  const tolerance = Math.floor((poAmount * input.toleranceBps) / 10000);

  if (Math.abs(input.invoiceAmount - poAmount) <= tolerance && Math.abs(input.invoiceAmount - receiptAmount) <= tolerance) {
    return { result: "matched" as const, varianceCents: input.invoiceAmount - receiptAmount };
  }

  if (input.invoiceAmount > poAmount + tolerance) {
    return { result: "over_bill" as const, varianceCents: input.invoiceAmount - poAmount };
  }

  if (input.invoiceAmount > receiptAmount + tolerance) {
    return { result: "under_receipt" as const, varianceCents: input.invoiceAmount - receiptAmount };
  }

  if (Math.abs(input.invoiceAmount - poAmount) > tolerance) {
    return { result: "price_variance" as const, varianceCents: input.invoiceAmount - poAmount };
  }

  return { result: "partial_match" as const, varianceCents: input.invoiceAmount - receiptAmount };
}

export const matchRunService = {
  async list(request: Request) {
    const { orgId } = requireContext(request);
    return await db.select().from(matchRuns).where(eq(matchRuns.organizationId, orgId));
  },

  async get(request: Request) {
    const { orgId } = requireContext(request);
    const params = matchRunIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db.select().from(matchRuns).where(and(eq(matchRuns.id, params.matchRunId), eq(matchRuns.organizationId, orgId)));
    if (!record) {
      throw notFound("Match run not found");
    }

    return record;
  },

  async create(request: Request) {
    const { orgId, userId } = requireContext(request);
    const body = createMatchRunSchema.parse(readValidatedBody(request));

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, body.invoiceId), eq(invoices.organizationId, orgId), isNull(invoices.deletedAt)));

    if (!invoice) {
      throw notFound("Invoice not found");
    }

    const poId = body.purchaseOrderId ?? invoice.purchaseOrderId;
    let poAmount: number | undefined;
    if (poId) {
      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.organizationId, orgId), isNull(purchaseOrders.deletedAt)));
      if (!po) {
        throw notFound("Purchase order not found");
      }
      poAmount = po.totalAmountCents;
    }

    let receiptAmount: number | undefined;
    if (body.receiptId) {
      const [receipt] = await db
        .select()
        .from(receipts)
        .where(and(eq(receipts.id, body.receiptId), eq(receipts.organizationId, orgId), isNull(receipts.deletedAt)));
      if (!receipt) {
        throw notFound("Receipt not found");
      }
      receiptAmount = receipt.receivedAmountCents;
    }

    const decision = computeMatchResult({
      invoiceAmount: invoice.totalAmountCents,
      poAmount,
      receiptAmount,
      toleranceBps: body.toleranceBps,
    });

    const [record] = await db
      .insert(matchRuns)
      .values({
        organizationId: orgId,
        projectId: body.projectId,
        invoiceId: body.invoiceId,
        purchaseOrderId: poId ?? null,
        receiptId: body.receiptId ?? null,
        result: decision.result,
        toleranceBps: body.toleranceBps,
        varianceCents: decision.varianceCents,
        details: {
          invoiceAmountCents: invoice.totalAmountCents,
          purchaseOrderAmountCents: poAmount,
          receiptAmountCents: receiptAmount,
        },
        createdByUserId: userId,
      })
      .returning();

    await db.insert(auditLogs).values({
      organizationId: orgId,
      actorUserId: userId,
      entityType: "match_run",
      entityId: record.id,
      action: "create",
      beforeData: null,
      afterData: {
        result: record.result,
        toleranceBps: record.toleranceBps,
        varianceCents: record.varianceCents,
      },
      metadata: {
        projectId: record.projectId,
        invoiceId: record.invoiceId,
        purchaseOrderId: record.purchaseOrderId,
        receiptId: record.receiptId,
      },
    });

    return record;
  },
};
