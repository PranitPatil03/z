import { Router } from "express";
import {
	archiveBillingRecordController,
	createBillingRecordController,
	getBillingRecordController,
	listBillingRecordsController,
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
import {
	billingRecordIdParamsSchema,
	createBillingRecordSchema,
	updateBillingRecordSchema,
} from "../schemas/billing.schema";

export const billingRouter = Router();

// Stripe webhook - no auth required
billingRouter.post("/webhook/stripe", asyncHandler(stripeWebhookController));

billingRouter.use(requireAuth);

billingRouter.get("/", asyncHandler(listBillingRecordsController));
billingRouter.post("/", validateBody(createBillingRecordSchema), asyncHandler(createBillingRecordController));
billingRouter.get("/:billingRecordId", validateParams(billingRecordIdParamsSchema), asyncHandler(getBillingRecordController));
billingRouter.patch(
	"/:billingRecordId",
	validateParams(billingRecordIdParamsSchema),
	validateBody(updateBillingRecordSchema),
	asyncHandler(updateBillingRecordController),
);
billingRouter.delete("/:billingRecordId", validateParams(billingRecordIdParamsSchema), asyncHandler(archiveBillingRecordController));

// Stripe payment routes
billingRouter.post("/stripe/payment-intent", validateBody(createBillingRecordSchema), asyncHandler(stripeCreatePaymentIntentController));
billingRouter.post("/stripe/subscription", validateBody(createBillingRecordSchema), asyncHandler(stripeCreateSubscriptionController));
