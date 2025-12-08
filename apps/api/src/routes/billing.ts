import { Router } from "express";
import {
	archiveBillingRecordController,
	createBillingRecordController,
	getBillingRecordController,
	listBillingRecordsController,
	getUsageSummaryController,
	updateBillingRecordController,
} from "../controllers/billing";
import {
	stripeWebhookController,
	stripeCreatePaymentIntentController,
	stripeCreateSubscriptionController,
} from "../controllers/stripe";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import { requireOrgRole } from "../middleware/require-role";
import {
	billingRecordIdParamsSchema,
	createBillingRecordSchema,
	updateBillingRecordSchema,
} from "../schemas/billing.schema";

export const billingRouter: import("express").Router = Router();

// Stripe webhook - no auth required
billingRouter.post("/webhook/stripe", asyncHandler(stripeWebhookController));

billingRouter.use(requireAuth);

billingRouter.get("/", asyncHandler(listBillingRecordsController));
billingRouter.get("/usage", asyncHandler(getUsageSummaryController));
billingRouter.post("/", requireOrgRole("owner", "admin"), validateBody(createBillingRecordSchema), asyncHandler(createBillingRecordController));
billingRouter.get("/:billingRecordId", validateParams(billingRecordIdParamsSchema), asyncHandler(getBillingRecordController));
billingRouter.patch(
	"/:billingRecordId",
	validateParams(billingRecordIdParamsSchema),
	validateBody(updateBillingRecordSchema),
	asyncHandler(updateBillingRecordController),
);
billingRouter.delete("/:billingRecordId", requireOrgRole("owner", "admin"), validateParams(billingRecordIdParamsSchema), asyncHandler(archiveBillingRecordController));

// Stripe payment routes — owner/admin only
billingRouter.post("/stripe/payment-intent", requireOrgRole("owner", "admin"), validateBody(createBillingRecordSchema), asyncHandler(stripeCreatePaymentIntentController));
billingRouter.post("/stripe/subscription", requireOrgRole("owner", "admin"), validateBody(createBillingRecordSchema), asyncHandler(stripeCreateSubscriptionController));
