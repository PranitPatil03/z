export interface CommandCenterHealthInputs {
  budgetBurnBps: number;
  highRiskAlertCount: number;
  openChangeOrderCount: number;
  overdueComplianceCount: number;
  pendingPayApplicationCount: number;
  pendingPayApplicationAverageAgeDays: number;
  reviewedSiteSnapRateBps: number;
}

export type CommandCenterHealthBand = "healthy" | "watch" | "critical";

export interface CommandCenterHealthFactor {
  key: string;
  label: string;
  value: number;
  impactBps: number;
  status: "ok" | "warning" | "critical";
  description: string;
}

export interface CommandCenterHealthResult {
  score: number;
  scoreBps: number;
  band: CommandCenterHealthBand;
  factors: CommandCenterHealthFactor[];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toStatus(impactBps: number) {
  const absolute = Math.abs(impactBps);
  if (absolute === 0) {
    return "ok" as const;
  }
  if (absolute < 700) {
    return "warning" as const;
  }
  return "critical" as const;
}

export function computeRateBps(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }

  return clamp(Math.round((numerator / denominator) * 10_000), 0, 10_000);
}

export function computeBudgetBurnBps(totalBudgetCents: number, totalActualCents: number) {
  if (!Number.isFinite(totalBudgetCents) || !Number.isFinite(totalActualCents)) {
    return 0;
  }

  if (totalBudgetCents <= 0) {
    return totalActualCents > 0 ? 10_000 : 0;
  }

  return Math.max(0, Math.round((totalActualCents / totalBudgetCents) * 10_000));
}

export function computeAverageAgeDays(dates: Date[], now: Date = new Date()) {
  if (dates.length === 0) {
    return 0;
  }

  const nowTime = now.getTime();
  const totalDays = dates.reduce((sum, date) => {
    const ms = Math.max(0, nowTime - date.getTime());
    return sum + ms / (24 * 60 * 60 * 1000);
  }, 0);

  return Number((totalDays / dates.length).toFixed(2));
}

export function buildHealthScore(inputs: CommandCenterHealthInputs): CommandCenterHealthResult {
  const factors: CommandCenterHealthFactor[] = [];

  const normalizedBurn = Math.max(0, inputs.budgetBurnBps);
  const budgetPenalty =
    normalizedBurn <= 8_500
      ? 0
      : normalizedBurn <= 10_000
        ? Math.round(((normalizedBurn - 8_500) / 1_500) * 1_600)
        : clamp(1_600 + Math.round((normalizedBurn - 10_000) * 0.4), 1_600, 2_600);
  factors.push({
    key: "budget_burn",
    label: "Budget burn",
    value: normalizedBurn,
    impactBps: -budgetPenalty,
    status: toStatus(-budgetPenalty),
    description: "Tracks actual spend against total budget.",
  });

  const highRiskPenalty = clamp(inputs.highRiskAlertCount * 300, 0, 1_800);
  factors.push({
    key: "high_risk_alerts",
    label: "High-risk alerts",
    value: inputs.highRiskAlertCount,
    impactBps: -highRiskPenalty,
    status: toStatus(-highRiskPenalty),
    description: "Counts unresolved high/critical budget alerts.",
  });

  const openChangeOrderPenalty = clamp(inputs.openChangeOrderCount * 175, 0, 1_400);
  factors.push({
    key: "open_change_orders",
    label: "Open change orders",
    value: inputs.openChangeOrderCount,
    impactBps: -openChangeOrderPenalty,
    status: toStatus(-openChangeOrderPenalty),
    description: "Open change orders add schedule and cost risk.",
  });

  const overdueCompliancePenalty = clamp(inputs.overdueComplianceCount * 275, 0, 2_200);
  factors.push({
    key: "overdue_compliance",
    label: "Overdue compliance items",
    value: inputs.overdueComplianceCount,
    impactBps: -overdueCompliancePenalty,
    status: toStatus(-overdueCompliancePenalty),
    description: "Overdue compliance artifacts increase operational exposure.",
  });

  const payAppAgeExcess = Math.max(0, inputs.pendingPayApplicationAverageAgeDays - 7);
  const payAppPenalty = clamp(
    Math.round(payAppAgeExcess * 80) + inputs.pendingPayApplicationCount * 40,
    0,
    1_200,
  );
  factors.push({
    key: "pending_pay_applications",
    label: "Pending pay applications",
    value: inputs.pendingPayApplicationCount,
    impactBps: -payAppPenalty,
    status: toStatus(-payAppPenalty),
    description: "Long-running payment reviews indicate cash-flow and approval risk.",
  });

  const snapRateGap = Math.max(0, 7_000 - inputs.reviewedSiteSnapRateBps);
  const snapRatePenalty = clamp(Math.round(snapRateGap / 10), 0, 800);
  factors.push({
    key: "site_snap_review_rate",
    label: "Reviewed SiteSnap rate",
    value: inputs.reviewedSiteSnapRateBps,
    impactBps: -snapRatePenalty,
    status: toStatus(-snapRatePenalty),
    description: "Higher review completion improves confidence in field visibility.",
  });

  const totalPenalty = factors.reduce((sum, factor) => sum + Math.abs(factor.impactBps), 0);
  const scoreBps = clamp(10_000 - totalPenalty, 0, 10_000);
  const score = Math.round(scoreBps / 100);
  const band: CommandCenterHealthBand = scoreBps >= 8_000 ? "healthy" : scoreBps >= 6_000 ? "watch" : "critical";

  return {
    score,
    scoreBps,
    band,
    factors,
  };
}
