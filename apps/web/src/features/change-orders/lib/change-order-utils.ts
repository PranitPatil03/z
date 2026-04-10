import type {
  ChangeOrder,
  DecisionHistoryEntry,
} from "@/lib/api/modules/change-orders-api";

export type SlaState = "none" | "ok" | "warning" | "overdue";

export interface SlaIndicator {
  state: SlaState;
  minutesRemaining: number | null;
  label: string;
}

export interface ChangeOrderTimelineEvent {
  id: string;
  at: string;
  label: string;
  detail?: string;
}

function minutesFromNow(targetIso: string, now: Date) {
  const timestamp = new Date(targetIso).getTime();
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return Math.round((timestamp - now.getTime()) / 60000);
}

function formatDurationLabel(minutes: number) {
  const absoluteMinutes = Math.abs(minutes);
  const days = Math.floor(absoluteMinutes / 1440);
  const hours = Math.floor((absoluteMinutes % 1440) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  return `${Math.max(0, hours)}h ${absoluteMinutes % 60}m`;
}

export function getSlaIndicator(
  deadlineAt?: string | null,
  now = new Date(),
): SlaIndicator {
  if (!deadlineAt) {
    return {
      state: "none",
      minutesRemaining: null,
      label: "No SLA deadline",
    };
  }

  const minutesRemaining = minutesFromNow(deadlineAt, now);
  if (minutesRemaining === null) {
    return {
      state: "none",
      minutesRemaining: null,
      label: "Invalid deadline",
    };
  }

  if (minutesRemaining < 0) {
    return {
      state: "overdue",
      minutesRemaining,
      label: `Overdue by ${formatDurationLabel(minutesRemaining)}`,
    };
  }

  if (minutesRemaining <= 24 * 60) {
    return {
      state: "warning",
      minutesRemaining,
      label: `Due in ${formatDurationLabel(minutesRemaining)}`,
    };
  }

  return {
    state: "ok",
    minutesRemaining,
    label: `Due in ${formatDurationLabel(minutesRemaining)}`,
  };
}

export function getDecisionHistory(order: ChangeOrder): DecisionHistoryEntry[] {
  const history = order.metadata?.approvalFlow?.history;
  if (!Array.isArray(history)) {
    return [];
  }

  return [...history].sort((a, b) => {
    const aTime = new Date(a.at).getTime();
    const bTime = new Date(b.at).getTime();
    return aTime - bTime;
  });
}

export function buildChangeOrderTimeline(
  order: ChangeOrder,
): ChangeOrderTimelineEvent[] {
  const events: ChangeOrderTimelineEvent[] = [
    {
      id: `${order.id}-created`,
      at: order.createdAt,
      label: "Created",
      detail: `Initial status: ${order.status}`,
    },
  ];

  if (order.submittedAt) {
    events.push({
      id: `${order.id}-submitted`,
      at: order.submittedAt,
      label: "Submitted",
      detail: `Stage: ${order.pipelineStage}`,
    });
  }

  for (const entry of getDecisionHistory(order)) {
    events.push({
      id: `${order.id}-${entry.stage}-${entry.at}`,
      at: entry.at,
      label: `${entry.decision} (${entry.stage})`,
      detail: entry.comment ?? undefined,
    });
  }

  if (order.resolvedAt) {
    events.push({
      id: `${order.id}-resolved`,
      at: order.resolvedAt,
      label: `Resolved (${order.status})`,
    });
  }

  return events.sort((a, b) => {
    const aTime = new Date(a.at).getTime();
    const bTime = new Date(b.at).getTime();
    return aTime - bTime;
  });
}

export function canSubmitForApproval(status: ChangeOrder["status"]) {
  return status === "draft" || status === "revision_requested";
}

export function canDecide(status: ChangeOrder["status"]) {
  return status === "submitted" || status === "under_review";
}
