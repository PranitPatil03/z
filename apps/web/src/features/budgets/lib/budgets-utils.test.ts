import type { BudgetReconciliationItem } from "@/lib/api/modules/budgets-api";
import { describe, expect, it } from "vitest";
import {
  bpsToPercent,
  computeVariancePercent,
  isVarianceAtRisk,
  summarizeReconciliation,
} from "./budgets-utils";

describe("budgets utils", () => {
  it("converts basis points to percentage", () => {
    expect(bpsToPercent(500)).toBe(5);
    expect(bpsToPercent(1234)).toBe(12.34);
  });

  it("computes variance percent from metrics", () => {
    expect(
      computeVariancePercent({
        budgetMinusCommittedCents: 0,
        committedMinusActualCents: 0,
        budgetMinusActualCents: 0,
        varianceBps: 725,
        billedPercentOfCommittedBps: 0,
      }),
    ).toBe(7.25);
  });

  it("flags risk when variance crosses threshold", () => {
    const metrics = {
      budgetMinusCommittedCents: 0,
      committedMinusActualCents: 0,
      budgetMinusActualCents: 0,
      varianceBps: 900,
      billedPercentOfCommittedBps: 0,
    };

    expect(isVarianceAtRisk(metrics, 500)).toBe(true);
    expect(isVarianceAtRisk(metrics, 1000)).toBe(false);
  });

  it("summarizes reconciliation result counts", () => {
    const items: BudgetReconciliationItem[] = [
      {
        id: "cc-1",
        code: "03-1000",
        name: "Concrete",
        budgetCents: 100000,
        committedCents: 120000,
        actualCents: 110000,
        billedCents: 90000,
        metrics: {
          budgetMinusCommittedCents: -20000,
          committedMinusActualCents: 10000,
          budgetMinusActualCents: -10000,
          varianceBps: 1000,
          billedPercentOfCommittedBps: 7500,
        },
        effectiveAlertThresholdBps: 500,
        entryStats: {
          count: 3,
          committed: 120000,
          actual: 110000,
          billed: 90000,
        },
        latestAlert: {
          id: "alert-1",
          organizationId: "org-1",
          projectId: "project-1",
          costCodeId: "cc-1",
          severity: "high",
          narrative: "Variance exceeded",
          createdAt: "2026-04-10T00:00:00.000Z",
          resolvedAt: null,
        },
      },
      {
        id: "cc-2",
        code: "04-2000",
        name: "Steel",
        budgetCents: 200000,
        committedCents: 180000,
        actualCents: 170000,
        billedCents: 150000,
        metrics: {
          budgetMinusCommittedCents: 20000,
          committedMinusActualCents: 10000,
          budgetMinusActualCents: 30000,
          varianceBps: -1500,
          billedPercentOfCommittedBps: 8333,
        },
        effectiveAlertThresholdBps: 500,
        entryStats: {
          count: 2,
          committed: 180000,
          actual: 170000,
          billed: 150000,
        },
        latestAlert: null,
      },
    ];

    expect(summarizeReconciliation(items)).toEqual({
      total: 2,
      unresolvedAlerts: 1,
      overBudget: 1,
    });
  });
});
