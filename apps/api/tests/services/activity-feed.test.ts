import { describe, expect, it } from "vitest";
import { buildActivityHealthAssessment } from "../../src/services/activity-feed";

describe("activity feed health assessment", () => {
  it("returns a healthy score when risk metrics are low", () => {
    const result = buildActivityHealthAssessment({
      pendingChangeOrders: 0,
      overBudgetItems: 0,
      unpaidInvoices: 0,
    });

    expect(result.score).toBe(100);
    expect(result.status).toBe("healthy");
    expect(result.factors.every((factor) => factor.status === "ok")).toBe(true);
  });

  it("returns critical score and recommendations for high risk metrics", () => {
    const result = buildActivityHealthAssessment({
      pendingChangeOrders: 10,
      overBudgetItems: 8,
      unpaidInvoices: 7,
    });

    expect(result.score).toBeLessThan(60);
    expect(result.status).toBe("critical");
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});
