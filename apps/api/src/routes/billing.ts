import { Router } from "express";
import {
  archiveBillingRecordController,
  createBillingRecordController,
  getBillingRecordController,
  getUsageSummaryController,
  listBillingRecordsController,
  listSubscriptionPlansController,
  updateBillingRecordController,
  updateSubscriptionPlanController,
} from "../controllers/billing";
import {
  stripeCreateCheckoutSessionController,
  stripeCreatePaymentIntentController,
  stripeListCheckoutPricingController,
  stripeCreateSubscriptionController,
  stripeListWebhookEventsController,
  stripeRetryWebhookEventController,
  stripeWebhookController,
} from "../controllers/stripe";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams, validateQuery } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import { requireOrgRole } from "../middleware/require-role";
import {
  billingRecordIdParamsSchema,
  createBillingRecordSchema,
  createStripeCheckoutSessionSchema,
  createStripePaymentIntentSchema,
  createStripeSubscriptionSchema,
  listStripeWebhookEventsQuerySchema,
  stripeWebhookEventParamsSchema,
  updateBillingRecordSchema,
  updateSubscriptionPlanSchema,
} from "../schemas/billing.schema";

export const billingRouter: import("express").Router = Router();

// Stripe webhook - no auth required
billingRouter.post("/webhook/stripe", asyncHandler(stripeWebhookController));

billingRouter.use(requireAuth);

billingRouter.get("/", asyncHandler(listBillingRecordsController));
billingRouter.get("/usage", asyncHandler(getUsageSummaryController));
billingRouter.get("/plans", asyncHandler(listSubscriptionPlansController));
billingRouter.patch(
  "/subscription/plan",
  requireOrgRole("owner", "admin"),
  validateBody(updateSubscriptionPlanSchema),
  asyncHandler(updateSubscriptionPlanController),
);
billingRouter.post(
  "/",
  requireOrgRole("owner", "admin"),
  validateBody(createBillingRecordSchema),
  asyncHandler(createBillingRecordController),
);
billingRouter.get(
  "/:billingRecordId",
  validateParams(billingRecordIdParamsSchema),
  asyncHandler(getBillingRecordController),
);
billingRouter.patch(
  "/:billingRecordId",
  validateParams(billingRecordIdParamsSchema),
  validateBody(updateBillingRecordSchema),
  asyncHandler(updateBillingRecordController),
);
billingRouter.delete(
  "/:billingRecordId",
  requireOrgRole("owner", "admin"),
  validateParams(billingRecordIdParamsSchema),
  asyncHandler(archiveBillingRecordController),
);

// Stripe payment routes — owner/admin only
billingRouter.get(
  "/stripe/pricing",
  asyncHandler(stripeListCheckoutPricingController),
);

billingRouter.post(
  "/stripe/checkout-session",
  requireOrgRole("owner", "admin"),
  validateBody(createStripeCheckoutSessionSchema),
  asyncHandler(stripeCreateCheckoutSessionController),
);

billingRouter.post(
  "/stripe/payment-intent",
  requireOrgRole("owner", "admin"),
  validateBody(createStripePaymentIntentSchema),
  asyncHandler(stripeCreatePaymentIntentController),
);
billingRouter.post(
  "/stripe/subscription",
  requireOrgRole("owner", "admin"),
  validateBody(createStripeSubscriptionSchema),
  asyncHandler(stripeCreateSubscriptionController),
);

billingRouter.get(
  "/stripe/webhook-events",
  requireOrgRole("owner", "admin"),
  validateQuery(listStripeWebhookEventsQuerySchema),
  asyncHandler(stripeListWebhookEventsController),
);

billingRouter.post(
  "/stripe/webhook-events/:eventId/retry",
  requireOrgRole("owner", "admin"),
  validateParams(stripeWebhookEventParamsSchema),
  asyncHandler(stripeRetryWebhookEventController),
);
