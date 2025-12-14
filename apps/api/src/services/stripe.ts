import {
  billingRecords,
  organizationSubscriptions,
  stripeWebhookEvents,
} from "@foreman/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import Stripe from "stripe";
import { env } from "../config/env";
import { db } from "../database";
import { badRequest, notFound, unauthorized } from "../lib/errors";
import { logger } from "../lib/logger";
import { eventService } from "./events";

const STRIPE_GRACE_PERIOD_DAYS = 7;

type InternalSubscriptionStatus = "active" | "grace" | "suspended";
type CheckoutPlan = "growth" | "enterprise";

type StripeCheckoutPriceSummary = {
  plan: CheckoutPlan;
  priceId: string | null;
  amountCents: number | null;
  currency: string | null;
  interval: Stripe.Price.Recurring.Interval | null;
  intervalCount: number | null;
  productName: string | null;
  nickname: string | null;
  available: boolean;
  message?: string;
};

function getStripeClient(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY environment variable is required for billing operations",
    );
  }
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-08-27.basil",
  });
}

let _stripe: Stripe | null = null;
function stripe(): Stripe {
  if (!_stripe) {
    _stripe = getStripeClient();
  }
  return _stripe;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subscription = invoice.parent?.subscription_details?.subscription;
  if (!subscription) {
    return null;
  }
  return typeof subscription === "string" ? subscription : subscription.id;
}

function isAppErrorLike(error: unknown): error is { statusCode: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode?: unknown }).statusCode === "number"
  );
}

function getConfiguredPriceIdForPlan(plan: CheckoutPlan) {
  if (plan === "growth") {
    return env.STRIPE_PRICE_ID_GROWTH;
  }

  return env.STRIPE_PRICE_ID_ENTERPRISE;
}

function getStripeProductName(product: Stripe.Price["product"]) {
  if (!product || typeof product === "string") {
    return null;
  }

  if ("deleted" in product && product.deleted) {
    return null;
  }

  return product.name ?? null;
}

function getStripePriceSearchText(price: Stripe.Price) {
  const productName = getStripeProductName(price.product) ?? "";

  return [price.id, price.lookup_key, price.nickname, productName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function doesPriceMatchPlan(price: Stripe.Price, plan: CheckoutPlan) {
  const searchText = getStripePriceSearchText(price);
  return searchText.includes(plan);
}

function summarizeCheckoutPrice(
  plan: CheckoutPlan,
  price: Stripe.Price,
): StripeCheckoutPriceSummary {
  return {
    plan,
    priceId: price.id,
    amountCents: price.unit_amount ?? null,
    currency: price.currency?.toUpperCase() ?? null,
    interval: price.recurring?.interval ?? null,
    intervalCount: price.recurring?.interval_count ?? null,
    productName: getStripeProductName(price.product),
    nickname: price.nickname ?? null,
    available: true,
  };
}

function unavailableCheckoutPrice(
  plan: CheckoutPlan,
  message: string,
): StripeCheckoutPriceSummary {
  return {
    plan,
    priceId: null,
    amountCents: null,
    currency: null,
    interval: null,
    intervalCount: null,
    productName: null,
    nickname: null,
    available: false,
    message,
  };
}

async function listActiveRecurringPrices() {
  const prices = await stripe().prices.list({
    active: true,
    type: "recurring",
    limit: 100,
    expand: ["data.product"],
  });

  return prices.data;
}

async function resolveCheckoutPrice(
  plan: CheckoutPlan,
  cachedCatalog?: Stripe.Price[],
) {
  const configuredPriceId = getConfiguredPriceIdForPlan(plan);

  if (configuredPriceId) {
    return await stripe().prices.retrieve(configuredPriceId, {
      expand: ["product"],
    });
  }

  const catalog = cachedCatalog ?? (await listActiveRecurringPrices());
  const matchedPrice = catalog.find((price) => doesPriceMatchPlan(price, plan));

  if (!matchedPrice) {
    throw badRequest(
      `No recurring Stripe price found for '${plan}'. Configure STRIPE_PRICE_ID_${plan.toUpperCase()} or add a recurring Stripe price with '${plan}' in lookup key, nickname, or product name.`,
    );
  }

  return matchedPrice;
}

function buildEventPayload(event: Stripe.Event) {
  const object = event.data.object as { id?: string; object?: string };

  return {
    id: event.id,
    type: event.type,
    created: event.created,
    livemode: event.livemode,
    objectId: typeof object.id === "string" ? object.id : null,
    objectType: typeof object.object === "string" ? object.object : null,
  } satisfies Record<string, unknown>;
}

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): InternalSubscriptionStatus {
  if (status === "active" || status === "trialing") {
    return "active";
  }
  if (status === "past_due" || status === "unpaid" || status === "incomplete") {
    return "grace";
  }
  return "suspended";
}

export function inferSubscriptionPlan(planHint: string | null | undefined) {
  const normalized = planHint?.toLowerCase() ?? "";
  if (normalized.includes("enterprise")) {
    return "enterprise" as const;
  }
  if (normalized.includes("growth") || normalized.includes("pro")) {
    return "growth" as const;
  }
  return "starter" as const;
}

function getSubscriptionPlanHint(subscription: Stripe.Subscription) {
  const firstPrice = subscription.items.data[0]?.price;
  return (
    subscription.metadata?.plan ??
    firstPrice?.lookup_key ??
    firstPrice?.nickname ??
    firstPrice?.id ??
    null
  );
}

function getSubscriptionCustomerId(subscription: Stripe.Subscription) {
  return typeof subscription.customer === "string"
    ? subscription.customer
    : (subscription.customer?.id ?? null);
}

function getSubscriptionCycleBounds(subscription: Stripe.Subscription) {
  const firstItem = subscription.items.data[0] as Stripe.SubscriptionItem & {
    current_period_start?: number;
    current_period_end?: number;
  };

  const now = new Date();
  const cycleStartAt =
    typeof firstItem?.current_period_start === "number"
      ? new Date(firstItem.current_period_start * 1000)
      : now;
  const cycleEndAt =
    typeof firstItem?.current_period_end === "number"
      ? new Date(firstItem.current_period_end * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    cycleStartAt,
    cycleEndAt,
  };
}

async function resolveOrganizationIdForSubscription(
  subscription: Stripe.Subscription,
) {
  const metadataOrganizationId = subscription.metadata?.organizationId;
  if (metadataOrganizationId) {
    return metadataOrganizationId;
  }

  const metadataBillingRecordId = subscription.metadata?.billingRecordId;
  if (metadataBillingRecordId) {
    const [recordByBillingId] = await db
      .select({ organizationId: billingRecords.organizationId })
      .from(billingRecords)
      .where(eq(billingRecords.id, metadataBillingRecordId))
      .limit(1);

    if (recordByBillingId) {
      return recordByBillingId.organizationId;
    }
  }

  const [recordBySubscription] = await db
    .select({ organizationId: billingRecords.organizationId })
    .from(billingRecords)
    .where(
      and(
        eq(billingRecords.subscriptionId, subscription.id),
        isNull(billingRecords.deletedAt),
      ),
    )
    .limit(1);

  return recordBySubscription?.organizationId ?? null;
}

async function upsertOrganizationSubscriptionStatus(
  organizationId: string,
  status: InternalSubscriptionStatus,
  metadata?: Record<string, unknown>,
) {
  const now = new Date();
  const graceEndsAt =
    status === "grace"
      ? new Date(now.getTime() + STRIPE_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)
      : null;

  await db
    .insert(organizationSubscriptions)
    .values({
      organizationId,
      status,
      graceEndsAt,
      metadata: metadata ?? null,
    })
    .onConflictDoUpdate({
      target: organizationSubscriptions.organizationId,
      set: {
        status,
        graceEndsAt,
        metadata: metadata ?? null,
        updatedAt: now,
      },
    });
}

async function syncOrganizationSubscriptionByStripeSubscription(
  subscription: Stripe.Subscription,
) {
  const organizationId =
    await resolveOrganizationIdForSubscription(subscription);
  if (!organizationId) {
    logger.warn(
      { subscriptionId: subscription.id },
      "Unable to resolve organization for Stripe subscription",
    );
    return;
  }

  const status = mapStripeSubscriptionStatus(subscription.status);
  const plan = inferSubscriptionPlan(getSubscriptionPlanHint(subscription));
  const now = new Date();
  const cycleBounds = getSubscriptionCycleBounds(subscription);
  const graceEndsAt =
    status === "grace"
      ? new Date(now.getTime() + STRIPE_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)
      : null;

  await db
    .insert(organizationSubscriptions)
    .values({
      organizationId,
      plan,
      status,
      cycleStartAt: cycleBounds.cycleStartAt,
      cycleEndAt: cycleBounds.cycleEndAt,
      graceEndsAt,
      metadata: {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: getSubscriptionCustomerId(subscription),
        stripePlanHint: getSubscriptionPlanHint(subscription),
      },
    })
    .onConflictDoUpdate({
      target: organizationSubscriptions.organizationId,
      set: {
        plan,
        status,
        cycleStartAt: cycleBounds.cycleStartAt,
        cycleEndAt: cycleBounds.cycleEndAt,
        graceEndsAt,
        metadata: {
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: getSubscriptionCustomerId(subscription),
          stripePlanHint: getSubscriptionPlanHint(subscription),
        },
        updatedAt: now,
      },
    });
}

async function syncOrganizationSubscriptionByBillingSubscriptionId(
  billingSubscriptionId: string,
  status: InternalSubscriptionStatus,
) {
  const [record] = await db
    .select({ organizationId: billingRecords.organizationId })
    .from(billingRecords)
    .where(
      and(
        eq(billingRecords.subscriptionId, billingSubscriptionId),
        isNull(billingRecords.deletedAt),
      ),
    )
    .limit(1);

  if (!record) {
    return;
  }

  await upsertOrganizationSubscriptionStatus(record.organizationId, status, {
    stripeSubscriptionId: billingSubscriptionId,
  });
}

async function processWebhookEvent(event: Stripe.Event) {
  let handlerResult: Record<string, unknown> | undefined;

  switch (event.type) {
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(
        event.data.object as Stripe.PaymentIntent,
      );
      break;

    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(
        event.data.object as Stripe.PaymentIntent,
      );
      break;

    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    case "customer.subscription.created":
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    default:
      logger.warn(
        { eventType: event.type },
        "Unhandled Stripe webhook event type",
      );
      handlerResult = { handled: false };
  }

  return handlerResult;
}

// Helper functions
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
) {
  const billingRecordId = paymentIntent.metadata?.billingRecordId;
  if (!billingRecordId) return;

  await db
    .update(billingRecords)
    .set({
      status: "paid",
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(billingRecords.id, billingRecordId));

  // Emit event
  const [record] = await db
    .select()
    .from(billingRecords)
    .where(eq(billingRecords.id, billingRecordId))
    .limit(1);

  if (record) {
    await eventService.emit({
      event: "payment.received",
      organizationId: record.organizationId,
      title: "Payment Received",
      message: `Payment of $${(record.amountCents / 100).toFixed(2)} for ${record.reference} was successfully processed.`,
      metadata: {
        billingRecordId,
        amount: record.amountCents,
      },
    });
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const billingRecordId = paymentIntent.metadata?.billingRecordId;
  if (!billingRecordId) return;

  await db
    .update(billingRecords)
    .set({
      status: "draft",
      updatedAt: new Date(),
    })
    .where(eq(billingRecords.id, billingRecordId));

  // Emit event
  const [record] = await db
    .select()
    .from(billingRecords)
    .where(eq(billingRecords.id, billingRecordId))
    .limit(1);

  if (record) {
    await eventService.emit({
      event: "payment.failed",
      organizationId: record.organizationId,
      title: "Payment Failed",
      message: `Payment for ${record.reference} failed. Please retry.`,
      metadata: {
        billingRecordId,
        reason: paymentIntent.last_payment_error?.message,
      },
    });
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  await db
    .update(billingRecords)
    .set({
      status: "paid",
      paidAt: new Date(),
    })
    .where(
      and(
        eq(billingRecords.subscriptionId, subscriptionId),
        isNull(billingRecords.deletedAt),
      ),
    );

  // Emit event
  const [record] = await db
    .select()
    .from(billingRecords)
    .where(
      and(
        eq(billingRecords.subscriptionId, subscriptionId),
        isNull(billingRecords.deletedAt),
      ),
    )
    .limit(1);

  if (record) {
    await eventService.emit({
      event: "payment.received",
      organizationId: record.organizationId,
      title: "Invoice Payment Received",
      message: `Invoice payment of $${(record.amountCents / 100).toFixed(2)} has been received.`,
      metadata: {
        billingRecordId: record.id,
        subscriptionId,
      },
    });
  }

  await syncOrganizationSubscriptionByBillingSubscriptionId(
    subscriptionId,
    "active",
  );
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  await db
    .update(billingRecords)
    .set({
      status: "draft",
    })
    .where(
      and(
        eq(billingRecords.subscriptionId, subscriptionId),
        isNull(billingRecords.deletedAt),
      ),
    );

  // Emit event
  const [record] = await db
    .select()
    .from(billingRecords)
    .where(
      and(
        eq(billingRecords.subscriptionId, subscriptionId),
        isNull(billingRecords.deletedAt),
      ),
    )
    .limit(1);

  if (record) {
    await eventService.emit({
      event: "payment.failed",
      organizationId: record.organizationId,
      title: "Invoice Payment Failed",
      message: `Invoice payment of $${(record.amountCents / 100).toFixed(2)} failed. Please retry.`,
      metadata: {
        billingRecordId: record.id,
        subscriptionId,
      },
    });
  }

  await syncOrganizationSubscriptionByBillingSubscriptionId(
    subscriptionId,
    "grace",
  );
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  await syncOrganizationSubscriptionByStripeSubscription(subscription);
  logger.info(
    { subscriptionId: subscription.id },
    "Stripe subscription created",
  );
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await syncOrganizationSubscriptionByStripeSubscription(subscription);
  logger.info(
    { subscriptionId: subscription.id },
    "Stripe subscription updated",
  );
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const organizationId =
    await resolveOrganizationIdForSubscription(subscription);
  if (organizationId) {
    await upsertOrganizationSubscriptionStatus(organizationId, "suspended", {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: getSubscriptionCustomerId(subscription),
    });
  }

  // Cancel associated billing records
  const billingRecordId = subscription.metadata?.billingRecordId;
  if (billingRecordId) {
    await db
      .update(billingRecords)
      .set({
        status: "void",
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(billingRecords.id, billingRecordId));
  }

  if (organizationId) {
    await eventService.emit({
      event: "subscription.cancelled",
      organizationId,
      title: "Subscription Cancelled",
      message: `Stripe subscription ${subscription.id} has been cancelled.`,
      metadata: {
        stripeSubscriptionId: subscription.id,
      },
    });
  }
}

export const stripeService = {
  async listCheckoutPricing() {
    const plans: CheckoutPlan[] = ["growth", "enterprise"];

    let recurringCatalog: Stripe.Price[] = [];
    try {
      recurringCatalog = await listActiveRecurringPrices();
    } catch (error) {
      logger.warn(
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        "Unable to preload Stripe recurring price catalog",
      );
    }

    const items = await Promise.all(
      plans.map(async (plan) => {
        try {
          const price = await resolveCheckoutPrice(
            plan,
            recurringCatalog.length > 0 ? recurringCatalog : undefined,
          );
          return summarizeCheckoutPrice(plan, price);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Stripe price is unavailable";
          logger.warn(
            {
              plan,
              error: message,
            },
            "Unable to resolve Stripe checkout price",
          );
          return unavailableCheckoutPrice(plan, message);
        }
      }),
    );

    return items;
  },

  async createCheckoutSession(params: {
    organizationId: string;
    customerEmail: string;
    customerName?: string;
    plan: CheckoutPlan;
    successUrl: string;
    cancelUrl: string;
  }) {
    const checkoutPrice = await resolveCheckoutPrice(params.plan);

    try {
      const session = await stripe().checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: checkoutPrice.id, quantity: 1 }],
        customer_email: params.customerEmail,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        allow_promotion_codes: true,
        client_reference_id: params.organizationId,
        metadata: {
          organizationId: params.organizationId,
          plan: params.plan,
        },
        subscription_data: {
          metadata: {
            organizationId: params.organizationId,
            plan: params.plan,
          },
        },
      });

      if (!session.url) {
        throw badRequest("Stripe checkout did not return a redirect URL.");
      }

      return {
        sessionId: session.id,
        url: session.url,
        plan: params.plan,
        price: summarizeCheckoutPrice(params.plan, checkoutPrice),
      };
    } catch (error) {
      if (isAppErrorLike(error)) {
        throw error;
      }

      throw badRequest(
        `Failed to create checkout session: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },

  /**
   * Create a Stripe customer for organization
   */
  async createCustomer(orgId: string, email: string, name: string) {
    try {
      const customer = await stripe().customers.create({
        name,
        email,
        metadata: {
          organizationId: orgId,
        },
      });

      // Update organization with Stripe customer ID
      // Note: This assumes organizations table has a stripeCustomerId field
      // You may need to add this field to the schema
      return customer;
    } catch (error) {
      throw badRequest(
        `Failed to create Stripe customer: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },

  /**
   * Create a payment intent for a billing record
   */
  async createPaymentIntent(billingRecordId: string, stripeCustomerId: string) {
    try {
      const [record] = await db
        .select()
        .from(billingRecords)
        .where(eq(billingRecords.id, billingRecordId))
        .limit(1);

      if (!record) {
        throw notFound("Billing record not found");
      }

      const paymentIntent = await stripe().paymentIntents.create({
        amount: record.amountCents,
        currency: record.currency.toLowerCase(),
        customer: stripeCustomerId,
        metadata: {
          billingRecordId,
          organizationId: record.organizationId,
          reference: record.reference,
        },
        description: `Payment for ${record.reference}`,
      });

      // Update billing record with payment intent ID
      await db
        .update(billingRecords)
        .set({
          stripePaymentIntentId: paymentIntent.id,
          stripeCustomerId,
        })
        .where(eq(billingRecords.id, billingRecordId));

      return paymentIntent;
    } catch (error) {
      throw badRequest(
        `Failed to create payment intent: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },

  /**
   * Create a subscription for recurring billing
   */
  async createSubscription(
    stripeCustomerId: string,
    priceId: string,
    billingRecordId: string,
    addOnPriceIds: string[] = [],
  ) {
    try {
      const [record] = await db
        .select({
          organizationId: billingRecords.organizationId,
        })
        .from(billingRecords)
        .where(eq(billingRecords.id, billingRecordId))
        .limit(1);

      if (!record) {
        throw notFound("Billing record not found");
      }

      const items = [
        {
          price: priceId,
        },
        ...addOnPriceIds.map((addOnPriceId) => ({
          price: addOnPriceId,
        })),
      ];

      const subscription = await stripe().subscriptions.create({
        customer: stripeCustomerId,
        items,
        metadata: {
          billingRecordId,
          type: "recurring",
          organizationId: record.organizationId,
        },
      });

      // Update billing record with subscription ID
      await db
        .update(billingRecords)
        .set({
          subscriptionId: subscription.id,
          stripeCustomerId,
        })
        .where(eq(billingRecords.id, billingRecordId));

      return subscription;
    } catch (error) {
      throw badRequest(
        `Failed to create subscription: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(event: Stripe.Event) {
    const [insertedEvent] = await db
      .insert(stripeWebhookEvents)
      .values({
        stripeEventId: event.id,
        eventType: event.type,
        processingStatus: "processing",
        payload: buildEventPayload(event),
      })
      .onConflictDoNothing()
      .returning({ id: stripeWebhookEvents.id });

    if (!insertedEvent) {
      logger.info(
        { eventId: event.id, eventType: event.type },
        "Skipping duplicate Stripe webhook event",
      );
      return { acknowledged: true, duplicate: true, eventId: event.id };
    }

    try {
      const handlerResult = await processWebhookEvent(event);

      await db
        .update(stripeWebhookEvents)
        .set({
          processingStatus: "processed",
          processedAt: new Date(),
          error: null,
          updatedAt: new Date(),
        })
        .where(eq(stripeWebhookEvents.id, insertedEvent.id));

      return {
        acknowledged: true,
        duplicate: false,
        eventId: event.id,
        ...(handlerResult ?? {}),
      };
    } catch (error) {
      await db
        .update(stripeWebhookEvents)
        .set({
          processingStatus: "failed",
          error:
            error instanceof Error
              ? error.message
              : "Unknown webhook processing error",
          updatedAt: new Date(),
        })
        .where(eq(stripeWebhookEvents.id, insertedEvent.id));

      throw error;
    }
  },

  async listWebhookEvents(options: {
    status?: "processing" | "processed" | "failed";
    limit: number;
  }) {
    const rows = options.status
      ? await db
          .select({
            id: stripeWebhookEvents.id,
            stripeEventId: stripeWebhookEvents.stripeEventId,
            eventType: stripeWebhookEvents.eventType,
            processingStatus: stripeWebhookEvents.processingStatus,
            error: stripeWebhookEvents.error,
            processedAt: stripeWebhookEvents.processedAt,
            createdAt: stripeWebhookEvents.createdAt,
            updatedAt: stripeWebhookEvents.updatedAt,
          })
          .from(stripeWebhookEvents)
          .where(eq(stripeWebhookEvents.processingStatus, options.status))
          .orderBy(desc(stripeWebhookEvents.createdAt))
          .limit(options.limit)
      : await db
          .select({
            id: stripeWebhookEvents.id,
            stripeEventId: stripeWebhookEvents.stripeEventId,
            eventType: stripeWebhookEvents.eventType,
            processingStatus: stripeWebhookEvents.processingStatus,
            error: stripeWebhookEvents.error,
            processedAt: stripeWebhookEvents.processedAt,
            createdAt: stripeWebhookEvents.createdAt,
            updatedAt: stripeWebhookEvents.updatedAt,
          })
          .from(stripeWebhookEvents)
          .orderBy(desc(stripeWebhookEvents.createdAt))
          .limit(options.limit);

    return {
      items: rows,
      total: rows.length,
    };
  },

  async retryWebhookEvent(eventId: string) {
    const [storedEvent] = await db
      .select({
        id: stripeWebhookEvents.id,
        stripeEventId: stripeWebhookEvents.stripeEventId,
      })
      .from(stripeWebhookEvents)
      .where(eq(stripeWebhookEvents.id, eventId))
      .limit(1);

    if (!storedEvent) {
      throw notFound("Stripe webhook event not found");
    }

    await db
      .update(stripeWebhookEvents)
      .set({
        processingStatus: "processing",
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(stripeWebhookEvents.id, storedEvent.id));

    try {
      const event = await stripe().events.retrieve(storedEvent.stripeEventId);
      const handlerResult = await processWebhookEvent(event);

      await db
        .update(stripeWebhookEvents)
        .set({
          processingStatus: "processed",
          processedAt: new Date(),
          error: null,
          updatedAt: new Date(),
        })
        .where(eq(stripeWebhookEvents.id, storedEvent.id));

      return {
        retried: true,
        eventId: storedEvent.stripeEventId,
        ...(handlerResult ?? {}),
      };
    } catch (error) {
      await db
        .update(stripeWebhookEvents)
        .set({
          processingStatus: "failed",
          error:
            error instanceof Error
              ? error.message
              : "Unknown webhook processing error",
          updatedAt: new Date(),
        })
        .where(eq(stripeWebhookEvents.id, storedEvent.id));

      throw badRequest(
        `Failed to retry webhook event: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },

  /**
   * Construct Stripe webhook event with raw body
   */
  constructWebhookEvent(
    body: string | Buffer,
    signature: string,
  ): Stripe.Event {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw unauthorized("Stripe webhook secret not configured");
    }

    return stripe().webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  },
};
