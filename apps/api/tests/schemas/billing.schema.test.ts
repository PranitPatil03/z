import { describe, expect, it } from "vitest";
import {
  createBillingRecordSchema,
  listStripeWebhookEventsQuerySchema,
  stripeWebhookEventParamsSchema,
  createStripePaymentIntentSchema,
  createStripeSubscriptionSchema,
} from "../../src/schemas/billing.schema";

describe("billing schemas", () => {
  it("accepts valid billing record payload", () => {
    const parsed = createBillingRecordSchema.parse({
      projectId: "proj-1",
      reference: "INV-2026-11",
      amountCents: 120000,
      currency: "USD",
    });

    expect(parsed.reference).toBe("INV-2026-11");
    expect(parsed.amountCents).toBe(120000);
  });

  it("validates stripe payment intent payload", () => {
    const parsed = createStripePaymentIntentSchema.parse({
      billingRecordId: "bill-1",
      stripeCustomerId: "cus_123",
    });

    expect(parsed.billingRecordId).toBe("bill-1");
  });

  it("rejects invalid stripe subscription payload", () => {
    expect(() =>
      createStripeSubscriptionSchema.parse({
        stripeCustomerId: "",
        priceId: "",
        billingRecordId: "bill-1",
      }),
    ).toThrow();
  });

  it("accepts stripe subscription payload with add-on prices", () => {
    const parsed = createStripeSubscriptionSchema.parse({
      stripeCustomerId: "cus_123",
      priceId: "price_base",
      billingRecordId: "bill-1",
      addOnPriceIds: ["price_addon_1", "price_addon_2"],
    });

    expect(parsed.addOnPriceIds).toEqual(["price_addon_1", "price_addon_2"]);
  });

  it("applies webhook event query defaults", () => {
    const parsed = listStripeWebhookEventsQuerySchema.parse({});

    expect(parsed.limit).toBe(20);
    expect(parsed.status).toBeUndefined();
  });

  it("validates webhook retry params", () => {
    const parsed = stripeWebhookEventParamsSchema.parse({ eventId: "evt-1" });

    expect(parsed.eventId).toBe("evt-1");
    expect(() => stripeWebhookEventParamsSchema.parse({ eventId: "" })).toThrow();
  });
});
