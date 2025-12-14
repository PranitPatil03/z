/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { billingApi } from "./billing-api";

function envelopeResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify({ data: payload }), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("billing api", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists billing records from envelope response", async () => {
    fetchMock.mockResolvedValueOnce(envelopeResponse([]));

    await billingApi.list({ limit: 25 });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/billing?");
    expect(String(url)).toContain("limit=25");
    expect(init?.method).toBe("GET");
  });

  it("creates billing record with expected payload", async () => {
    fetchMock.mockResolvedValueOnce(
      envelopeResponse({
        id: "bill_1",
        organizationId: "org_1",
        reference: "INV-100",
        amountCents: 10000,
        currency: "USD",
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );

    await billingApi.create({
      reference: "INV-100",
      amountCents: 10000,
      currency: "USD",
      dueDate: new Date().toISOString(),
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/billing");
    expect(init?.method).toBe("POST");

    const body = JSON.parse(String(init?.body)) as {
      reference: string;
      amountCents: number;
      currency: string;
    };

    expect(body.reference).toBe("INV-100");
    expect(body.amountCents).toBe(10000);
    expect(body.currency).toBe("USD");
  });

  it("updates subscription plan", async () => {
    fetchMock.mockResolvedValueOnce(
      envelopeResponse({
        previousPlan: "starter",
        subscription: {
          id: "sub_1",
          organizationId: "org_1",
          plan: "growth",
          status: "active",
          aiCreditsIncluded: 20000,
          aiCreditsUsed: 0,
          allowOverage: true,
          overagePriceCents: 2,
          cycleStartAt: new Date().toISOString(),
          cycleEndAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    );

    await billingApi.updateSubscriptionPlan({
      plan: "growth",
      reason: "Scale usage",
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/billing/subscription/plan");
    expect(init?.method).toBe("PATCH");
  });

  it("creates stripe payment intent", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        clientSecret: "pi_secret",
        paymentIntentId: "pi_1",
      }),
    );

    await billingApi.createPaymentIntent({
      billingRecordId: "bill_1",
      stripeCustomerId: "cus_1",
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/billing/stripe/payment-intent");
    expect(init?.method).toBe("POST");

    const body = JSON.parse(String(init?.body)) as {
      billingRecordId: string;
      stripeCustomerId: string;
    };

    expect(body.billingRecordId).toBe("bill_1");
    expect(body.stripeCustomerId).toBe("cus_1");
  });

  it("lists and retries webhook events", async () => {
    fetchMock
      .mockResolvedValueOnce(
        envelopeResponse({
          items: [
            {
              id: "evt_db_1",
              stripeEventId: "evt_1",
              eventType: "invoice.paid",
              processingStatus: "processed",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          total: 1,
        }),
      )
      .mockResolvedValueOnce(
        envelopeResponse({ retried: true, eventId: "evt_1" }),
      );

    await billingApi.listWebhookEvents({ status: "processed", limit: 10 });
    await billingApi.retryWebhookEvent("evt_db_1");

    const [listUrl] = fetchMock.mock.calls[0] ?? [];
    expect(String(listUrl)).toContain("/billing/stripe/webhook-events?");
    expect(String(listUrl)).toContain("status=processed");
    expect(String(listUrl)).toContain("limit=10");

    const [retryUrl, retryInit] = fetchMock.mock.calls[1] ?? [];
    expect(String(retryUrl)).toContain(
      "/billing/stripe/webhook-events/evt_db_1/retry",
    );
    expect(retryInit?.method).toBe("POST");
  });
});
