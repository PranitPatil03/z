import type {
  BudgetMetrics,
  BudgetReconciliationItem,
} from "@/lib/api/modules/budgets-api";

export function bpsToPercent(bps: number) {
  return bps / 100;
}

export function computeVariancePercent(metrics: BudgetMetrics) {
  return bpsToPercent(metrics.varianceBps);
}

export function isVarianceAtRisk(metrics: BudgetMetrics, thresholdBps: number) {
  return metrics.varianceBps >= thresholdBps;
}

export function summarizeReconciliation(items: BudgetReconciliationItem[]) {
  return items.reduce(
    (acc, item) => {
      acc.total += 1;
      if (item.latestAlert && !item.latestAlert.resolvedAt) {
        acc.unresolvedAlerts += 1;
      }
      if (item.metrics.varianceBps > 0) {
        acc.overBudget += 1;
      }
      return acc;
    },
    {
      total: 0,
      unresolvedAlerts: 0,
      overBudget: 0,
    },
  );
}
