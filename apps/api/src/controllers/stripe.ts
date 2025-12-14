import type { Request, Response } from "express";
import { env } from "../config/env";
import { badRequest } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  createStripeCheckoutSessionSchema,
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

function buildCheckoutUrl(
  baseUrl: string,
  requestedPath: string | undefined,
  fallbackPath: string,
) {
  const path = requestedPath?.trim() || fallbackPath;

  if (!path.startsWith("/")) {
    throw badRequest("Checkout redirect paths must start with '/'.");
  }

  return new URL(path, baseUrl).toString();
}

export async function stripeListCheckoutPricingController(
  _request: Request,
  response: Response,
) {
  const items = await stripeService.listCheckoutPricing();
  response.json({ items });
}

export async function stripeCreateCheckoutSessionController(
  request: Request,
  response: Response,
) {
  const authContext = getAuthContext(request);
  const organizationId = authContext.session.activeOrganizationId;

  if (!organizationId) {
    throw badRequest("An active organization is required for checkout.");
  }

  const { plan, successPath, cancelPath } =
    createStripeCheckoutSessionSchema.parse(readValidatedBody(request));

  const successUrl = buildCheckoutUrl(
    env.WEB_APP_URL,
    successPath,
    "/app/billing?checkout=success",
  );
  const cancelUrl = buildCheckoutUrl(
    env.WEB_APP_URL,
    cancelPath,
    "/app/billing?checkout=cancel",
  );

  const session = await stripeService.createCheckoutSession({
    organizationId,
    customerEmail: authContext.user.email,
    customerName: authContext.user.name,
    plan,
    successUrl,
    cancelUrl,
  });

  response.json(session);
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
