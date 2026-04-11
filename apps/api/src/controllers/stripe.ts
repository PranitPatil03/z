import type { Request, Response } from "express";
import { badRequest } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import {
  createStripePaymentIntentSchema,
  createStripeSubscriptionSchema,
  listStripeWebhookEventsQuerySchema,
  stripeWebhookEventParamsSchema,
} from "../schemas/billing.schema";
import { stripeService } from "../services/stripe";

function readValidatedBody<T>(request: Request) {
  return (request as ValidatedRequest).validated?.body as T;
}

function readValidatedQuery<T>(request: Request) {
  return (request as ValidatedRequest).validated?.query as T;
}

function readValidatedParams<T>(request: Request) {
  return (request as ValidatedRequest).validated?.params as T;
}

export async function stripeWebhookController(
  request: Request,
  response: Response,
) {
  const signature = request.headers["stripe-signature"];

  if (!signature || typeof signature !== "string") {
    throw badRequest("Missing Stripe signature");
  }

  try {
    // Get raw body as string (Express middleware should have raw access)
    const body =
      request.body instanceof Buffer
        ? request.body
        : JSON.stringify(request.body);

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

export async function stripeCreatePaymentIntentController(
  request: Request,
  response: Response,
) {
  const { billingRecordId, stripeCustomerId } =
    createStripePaymentIntentSchema.parse(readValidatedBody(request));

  const paymentIntent = await stripeService.createPaymentIntent(
    billingRecordId,
    stripeCustomerId,
  );

  response.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  });
}

export async function stripeCreateSubscriptionController(
  request: Request,
  response: Response,
) {
  const { stripeCustomerId, priceId, billingRecordId, addOnPriceIds } =
    createStripeSubscriptionSchema.parse(readValidatedBody(request));

  const subscription = await stripeService.createSubscription(
    stripeCustomerId,
    priceId,
    billingRecordId,
    addOnPriceIds,
  );

  response.json({
    subscriptionId: subscription.id,
    status: subscription.status,
  });
}

export async function stripeListWebhookEventsController(
  request: Request,
  response: Response,
) {
  const query = listStripeWebhookEventsQuerySchema.parse(
    readValidatedQuery(request),
  );
  const data = await stripeService.listWebhookEvents(query);

  response.json({ data });
}

export async function stripeRetryWebhookEventController(
  request: Request,
  response: Response,
) {
  const { eventId } = stripeWebhookEventParamsSchema.parse(
    readValidatedParams(request),
  );
  const data = await stripeService.retryWebhookEvent(eventId);

  response.json({ data });
}
