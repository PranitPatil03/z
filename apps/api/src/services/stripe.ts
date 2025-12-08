import Stripe from "stripe";
import { and, eq, isNull } from "drizzle-orm";
import { billingRecords } from "@foreman/db";
import { db } from "../database";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { badRequest, unauthorized, notFound } from "../lib/errors";
import { eventService } from "./events";

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

// Helper functions
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
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
  const [record] = await db.select().from(billingRecords).where(eq(billingRecords.id, billingRecordId)).limit(1);

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
  const [record] = await db.select().from(billingRecords).where(eq(billingRecords.id, billingRecordId)).limit(1);

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
    .where(and(eq(billingRecords.subscriptionId, subscriptionId), isNull(billingRecords.deletedAt)));

  // Emit event
  const [record] = await db
    .select()
    .from(billingRecords)
    .where(and(eq(billingRecords.subscriptionId, subscriptionId), isNull(billingRecords.deletedAt)))
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
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  await db
    .update(billingRecords)
    .set({
      status: "draft",
    })
    .where(and(eq(billingRecords.subscriptionId, subscriptionId), isNull(billingRecords.deletedAt)));

  // Emit event
  const [record] = await db
    .select()
    .from(billingRecords)
    .where(and(eq(billingRecords.subscriptionId, subscriptionId), isNull(billingRecords.deletedAt)))
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
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  logger.info({ subscriptionId: subscription.id }, "Stripe subscription created");
}

function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  logger.info({ subscriptionId: subscription.id }, "Stripe subscription updated");
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
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
}

export const stripeService = {
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
      throw badRequest(`Failed to create Stripe customer: ${error instanceof Error ? error.message : "Unknown error"}`);
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
      throw badRequest(`Failed to create payment intent: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },

  /**
   * Create a subscription for recurring billing
   */
  async createSubscription(
    stripeCustomerId: string,
    priceId: string,
    billingRecordId: string,
  ) {
    try {
      const subscription = await stripe().subscriptions.create({
        customer: stripeCustomerId,
        items: [
          {
            price: priceId,
          },
        ],
        metadata: {
          billingRecordId,
          type: "recurring",
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
    switch (event.type) {
      case "payment_intent.succeeded":
        return await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);

      case "payment_intent.payment_failed":
        return await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);

      case "invoice.payment_succeeded":
        return await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);

      case "invoice.payment_failed":
        return await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);

      case "customer.subscription.created":
        return handleSubscriptionCreated(event.data.object as Stripe.Subscription);

      case "customer.subscription.updated":
        return handleSubscriptionUpdated(event.data.object as Stripe.Subscription);

      case "customer.subscription.deleted":
        return await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);

      default:
        logger.warn({ eventType: event.type }, "Unhandled Stripe webhook event type");
        return { acknowledged: true };
    }
  },

  /**
   * Construct Stripe webhook event with raw body
   */
  constructWebhookEvent(body: string | Buffer, signature: string): Stripe.Event {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw unauthorized("Stripe webhook secret not configured");
    }

    return stripe().webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  },
};
