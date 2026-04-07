import { describe, expect, it } from "vitest";
import { inferSubscriptionPlan, mapStripeSubscriptionStatus } from "../../src/services/stripe";

describe("stripe service helpers", () => {
  it("maps Stripe subscription statuses to internal statuses", () => {
    expect(mapStripeSubscriptionStatus("active")).toBe("active");
    expect(mapStripeSubscriptionStatus("trialing")).toBe("active");
    expect(mapStripeSubscriptionStatus("past_due")).toBe("grace");
    expect(mapStripeSubscriptionStatus("unpaid")).toBe("grace");
    expect(mapStripeSubscriptionStatus("canceled")).toBe("suspended");
  });

  it("infers plan from Stripe plan hints", () => {
    expect(inferSubscriptionPlan("enterprise_annual")).toBe("enterprise");
    expect(inferSubscriptionPlan("growth-monthly")).toBe("growth");
    expect(inferSubscriptionPlan("pro-tier")).toBe("growth");
    expect(inferSubscriptionPlan("starter")).toBe("starter");
    expect(inferSubscriptionPlan(null)).toBe("starter");
  });
});
