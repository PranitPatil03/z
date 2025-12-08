import { Router } from "express";
import {
	archiveInvoiceController,
	createInvoiceController,
	getInvoiceController,
	listInvoicesController,
	updateInvoiceController,
} from "../controllers/invoice";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams, validateQuery } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import { createInvoiceSchema, invoiceIdParamsSchema, listInvoicesQuerySchema, updateInvoiceSchema } from "../schemas/invoice.schema";

export const invoicesRouter: import("express").Router = Router();

invoicesRouter.use(requireAuth);

invoicesRouter.get("/", validateQuery(listInvoicesQuerySchema), asyncHandler(listInvoicesController));
invoicesRouter.post("/", validateBody(createInvoiceSchema), asyncHandler(createInvoiceController));
invoicesRouter.get("/:invoiceId", validateParams(invoiceIdParamsSchema), asyncHandler(getInvoiceController));
invoicesRouter.patch(
	"/:invoiceId",
	validateParams(invoiceIdParamsSchema),
	validateBody(updateInvoiceSchema),
	asyncHandler(updateInvoiceController),
);
invoicesRouter.delete("/:invoiceId", validateParams(invoiceIdParamsSchema), asyncHandler(archiveInvoiceController));
