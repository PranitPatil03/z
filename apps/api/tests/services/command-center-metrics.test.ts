import { describe, expect, it } from "vitest";
import {
  buildHealthScore,
  computeAverageAgeDays,
  computeBudgetBurnBps,
  computeRateBps,
} from "../../src/services/command-center-metrics";

describe("command-center-metrics", () => {
  it("calculates basis-point rates and burn values", () => {
    expect(computeRateBps(3, 4)).toBe(7500);
    expect(computeRateBps(1, 0)).toBe(0);

    expect(computeBudgetBurnBps(100_000, 80_000)).toBe(8000);
    expect(computeBudgetBurnBps(0, 5_000)).toBe(10000);
  });

  it("computes average aging days for pending items", () => {
    const now = new Date("2026-04-07T00:00:00.000Z");
    const d1 = new Date("2026-04-05T00:00:00.000Z");
    const d2 = new Date("2026-04-03T00:00:00.000Z");

    expect(computeAverageAgeDays([d1, d2], now)).toBe(3);
    expect(computeAverageAgeDays([], now)).toBe(0);
  });

  it("returns healthy score for low-risk projects", () => {
    const result = buildHealthScore({
      budgetBurnBps: 6800,
      highRiskAlertCount: 0,
      openChangeOrderCount: 1,
      overdueComplianceCount: 0,
      pendingPayApplicationCount: 1,
      pendingPayApplicationAverageAgeDays: 2,
      reviewedSiteSnapRateBps: 9200,
    });

    expect(result.band).toBe("healthy");
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("returns critical score for high-risk projects", () => {
    const result = buildHealthScore({
      budgetBurnBps: 11500,
      highRiskAlertCount: 4,
      openChangeOrderCount: 6,
      overdueComplianceCount: 5,
      pendingPayApplicationCount: 4,
      pendingPayApplicationAverageAgeDays: 20,
      reviewedSiteSnapRateBps: 3200,
    });

    expect(result.band).toBe("critical");
    expect(result.score).toBeLessThan(60);
    expect(result.factors.some((factor) => factor.key === "overdue_compliance")).toBe(true);
  });
});
