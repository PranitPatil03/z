import type { ChangeOrder } from "@/lib/api/modules/change-orders-api";
import { describe, expect, it } from "vitest";
import {
  buildChangeOrderTimeline,
  canDecide,
  canSubmitForApproval,
  getDecisionHistory,
  getSlaIndicator,
} from "./change-order-utils";

function sampleChangeOrder(overrides?: Partial<ChangeOrder>): ChangeOrder {
  return {
    id: "co-1",
    organizationId: "org-1",
    projectId: "project-1",
    title: "Electrical rework",
    reason: "Code update",
    impactCostCents: 250000,
    impactDays: 5,
    status: "under_review",
    pipelineStage: "finance_review",
    deadlineAt: "2026-04-15T12:00:00.000Z",
    submittedAt: "2026-04-11T12:00:00.000Z",
    resolvedAt: null,
    createdByUserId: "user-1",
    decidedByUserId: null,
    metadata: {
      approvalFlow: {
        history: [
          {
            stage: "pm_review",
            decision: "submitted",
            actorUserId: "user-1",
            at: "2026-04-11T12:00:00.000Z",
          },
          {
            stage: "finance_review",
            decision: "approved",
            actorUserId: "user-2",
            at: "2026-04-12T12:00:00.000Z",
          },
        ],
      },
    },
    createdAt: "2026-04-10T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z",
    ...overrides,
  };
}

describe("change order utils", () => {
  it("derives warning SLA for near deadline", () => {
    const result = getSlaIndicator(
      "2026-04-11T12:00:00.000Z",
      new Date("2026-04-11T00:00:00.000Z"),
    );

    expect(result.state).toBe("warning");
    expect(result.label).toContain("Due in");
  });

  it("derives overdue SLA", () => {
    const result = getSlaIndicator(
      "2026-04-11T00:00:00.000Z",
      new Date("2026-04-11T12:00:00.000Z"),
    );

    expect(result.state).toBe("overdue");
    expect(result.label).toContain("Overdue by");
  });

  it("returns sorted decision history and timeline", () => {
    const order = sampleChangeOrder();
    const history = getDecisionHistory(order);
    const timeline = buildChangeOrderTimeline(order);

    expect(history).toHaveLength(2);
    expect(history[0]?.stage).toBe("pm_review");
    expect(timeline[0]?.label).toBe("Created");
    expect(timeline[timeline.length - 1]?.label).toContain("approved");
  });

  it("computes lifecycle action guards", () => {
    expect(canSubmitForApproval("draft")).toBe(true);
    expect(canSubmitForApproval("approved")).toBe(false);
    expect(canDecide("under_review")).toBe(true);
    expect(canDecide("closed")).toBe(false);
  });
});
