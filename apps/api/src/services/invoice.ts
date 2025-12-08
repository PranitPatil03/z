import { and, eq, isNull } from "drizzle-orm";
import { invoices } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import { createInvoiceSchema, invoiceIdParamsSchema, updateInvoiceSchema } from "../schemas/invoice.schema";

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

export const invoiceService = {
  async list(request: Request) {
    const orgId = requireOrg(request);
    return await db.select().from(invoices).where(and(eq(invoices.organizationId, orgId), isNull(invoices.deletedAt)));
  },

  async create(request: Request) {
    const orgId = requireOrg(request);
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

    return record;
  },

  async get(request: Request) {
    const orgId = requireOrg(request);
    const params = invoiceIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, params.invoiceId), eq(invoices.organizationId, orgId), isNull(invoices.deletedAt)));

    if (!record) {
      throw notFound("Invoice not found");
    }

    return record;
  },

  async update(request: Request) {
    const orgId = requireOrg(request);
    const params = invoiceIdParamsSchema.parse(readValidatedParams(request));
    const body = updateInvoiceSchema.parse(readValidatedBody(request));

    const [record] = await db
      .update(invoices)
      .set({
        ...body,
        dueDate: body.dueDate === undefined ? undefined : body.dueDate ? new Date(body.dueDate) : null,
        updatedAt: new Date(),
      })
      .where(and(eq(invoices.id, params.invoiceId), eq(invoices.organizationId, orgId), isNull(invoices.deletedAt)))
      .returning();

    if (!record) {
      throw notFound("Invoice not found");
    }

    return record;
  },

  async archive(request: Request) {
    const orgId = requireOrg(request);
    const params = invoiceIdParamsSchema.parse(readValidatedParams(request));

    const [record] = await db
      .update(invoices)
      .set({ status: "hold", deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(invoices.id, params.invoiceId), eq(invoices.organizationId, orgId), isNull(invoices.deletedAt)))
      .returning();

    if (!record) {
      throw notFound("Invoice not found");
    }

    return record;
  },
};
