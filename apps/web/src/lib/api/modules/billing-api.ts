import { requestJson } from "@/lib/api/http-client";
import type { PaginatedResponse } from "./projects-api";

export interface BillingRecord {
  id: string;
  organizationId: string;
  type: "payment" | "subscription" | "refund" | "credit";
  amountCents: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  description?: string | null;
  stripeId?: string | null;
  createdAt: string;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
}

export const billingApi = {
  list: (params?: { cursor?: string; limit?: number }) => {
    const qs = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return requestJson<PaginatedResponse<BillingRecord>>(`/billing${qs}`);
  },

  createPaymentIntent: (amountCents: number, currency = "usd") =>
    requestJson<PaymentIntentResult>("/billing/stripe/payment-intent", {
      method: "POST",
      body: { amountCents, currency },
    }),

  createSubscription: (priceId: string) =>
    requestJson<{ subscriptionId: string; clientSecret: string }>(
      "/billing/stripe/subscription",
      {
        method: "POST",
        body: { priceId },
      },
    ),
};
