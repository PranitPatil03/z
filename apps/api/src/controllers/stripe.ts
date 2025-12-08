import type { Request, Response } from "express";
import { stripeService } from "../services/stripe";
import { badRequest } from "../lib/errors";
import Stripe from "stripe";

export async function stripeWebhookController(request: Request, response: Response) {
  const signature = request.headers["stripe-signature"];

  if (!signature || typeof signature !== "string") {
    throw badRequest("Missing Stripe signature");
  }

  try {
    // Get raw body as string (Express middleware should have raw access)
    const body = request.body instanceof Buffer ? request.body : JSON.stringify(request.body);

    const event = stripeService.constructWebhookEvent(body, signature);

    // Handle the event
    const result = await stripeService.handleWebhookEvent(event);

    response.json({ received: true, ...result });
  } catch (error) {
    throw badRequest(
      `Webhook Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function stripeCreatePaymentIntentController(request: Request, response: Response) {
  const { billingRecordId, stripeCustomerId } = request.body as {
    billingRecordId: string;
    stripeCustomerId: string;
  };

  if (!billingRecordId || !stripeCustomerId) {
    throw badRequest("Missing billingRecordId or stripeCustomerId");
  }

  const paymentIntent = await stripeService.createPaymentIntent(billingRecordId, stripeCustomerId);

  response.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  });
}

export async function stripeCreateSubscriptionController(request: Request, response: Response) {
  const { stripeCustomerId, priceId, billingRecordId } = request.body as {
    stripeCustomerId: string;
    priceId: string;
    billingRecordId: string;
  };

  if (!stripeCustomerId || !priceId || !billingRecordId) {
    throw badRequest("Missing required fields");
  }

  const subscription = await stripeService.createSubscription(stripeCustomerId, priceId, billingRecordId);

  response.json({
    subscriptionId: subscription.id,
    status: subscription.status,
  });
}
