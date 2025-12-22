import type { ComplianceSummary } from "@/lib/api/modules/subconnect-api";

export function formatCents(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "-";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function toIsoOrUndefined(value?: string) {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return new Date(value).toISOString();
}

export function parseCommaSeparated(input: string) {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function riskLevelFromScoreBps(scoreBps: number) {
  if (scoreBps >= 8500) {
    return "low" as const;
  }
  if (scoreBps >= 6500) {
    return "medium" as const;
  }
  if (scoreBps >= 4500) {
    return "high" as const;
  }
  return "critical" as const;
}

export function complianceHealth(summary?: ComplianceSummary | null) {
  if (!summary || summary.total === 0) {
    return {
      label: "No requirements",
      tone: "neutral" as const,
    };
  }

  if (summary.overdue > 0 || summary.nonCompliant > 0 || summary.expired > 0) {
    return {
      label: `${summary.overdue + summary.nonCompliant + summary.expired} needs action`,
      tone: "critical" as const,
    };
  }

  if (summary.dueSoon > 0 || summary.pending > 0 || summary.expiring > 0) {
    return {
      label: `${summary.dueSoon + summary.pending + summary.expiring} in progress`,
      tone: "warning" as const,
    };
  }

  return {
    label: "Compliant",
    tone: "good" as const,
  };
}
