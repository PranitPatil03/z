import { z } from "zod";

export const subscriptionPlanSchema = z.enum([
  "starter",
  "growth",
  "enterprise",
]);

export const billingRecordIdParamsSchema = z.object({
  billingRecordId: z.string().min(1),
});

export const createBillingRecordSchema = z.object({
  projectId: z.string().min(1).optional(),
  reference: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().length(3).default("USD"),
  dueDate: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateBillingRecordSchema = z.object({
  projectId: z.string().min(1).optional(),
  reference: z.string().min(1).optional(),
  amountCents: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  status: z.enum(["draft", "issued", "paid", "void"]).optional(),
  dueDate: z.string().datetime().optional(),
  paidAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createStripePaymentIntentSchema = z.object({
  billingRecordId: z.string().min(1),
  stripeCustomerId: z.string().min(1),
});

export const createStripeSubscriptionSchema = z.object({
  stripeCustomerId: z.string().min(1),
  priceId: z.string().min(1),
  billingRecordId: z.string().min(1),
  addOnPriceIds: z.array(z.string().min(1)).optional(),
});

export const createStripeCheckoutSessionSchema = z.object({
  plan: z.enum(["growth", "enterprise"]),
  successPath: z.string().min(1).optional(),
  cancelPath: z.string().min(1).optional(),
});

export const listStripeWebhookEventsQuerySchema = z.object({
  status: z.enum(["processing", "processed", "failed"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const stripeWebhookEventParamsSchema = z.object({
  eventId: z.string().min(1),
});

export const updateSubscriptionPlanSchema = z.object({
  plan: subscriptionPlanSchema,
  reason: z.string().min(5).max(500).optional(),
});
