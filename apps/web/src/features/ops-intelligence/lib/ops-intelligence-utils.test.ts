import { describe, expect, it } from "vitest";
import {
  buildActivityFilters,
  summarizePortfolioProjects,
} from "./ops-intelligence-utils";

describe("ops-intelligence utilities", () => {
  it("rolls up portfolio summary values", () => {
    const summary = summarizePortfolioProjects([
      {
        summary: {
          openChangeOrders: 3,
          highRiskBudgetAlerts: 2,
          overdueComplianceItems: 1,
          pendingPayApplications: 4,
        },
      },
      {
        summary: {
          openChangeOrders: 7,
          highRiskBudgetAlerts: 1,
          overdueComplianceItems: 5,
          pendingPayApplications: 2,
        },
      },
    ]);

    expect(summary).toEqual({
      openChangeOrders: 10,
      highRiskBudgetAlerts: 3,
      overdueComplianceItems: 6,
      pendingPayApplications: 6,
    });
  });

  it("normalizes optional activity filter values", () => {
    const result = buildActivityFilters({
      page: 2,
      pageSize: 25,
      entityType: "",
      projectId: "project-1",
      action: "",
      from: "2026-04-10",
      to: "",
    });

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(25);
    expect(result.entityType).toBeUndefined();
    expect(result.projectId).toBe("project-1");
    expect(result.action).toBeUndefined();
    expect(result.from).toBe("2026-04-10T00:00:00.000Z");
    expect(result.to).toBeUndefined();
  });

  it("drops invalid date values from filters", () => {
    const result = buildActivityFilters({
      page: 1,
      pageSize: 20,
      from: "not-a-date",
      to: "2026-13-99",
    });

    expect(result.from).toBeUndefined();
    expect(result.to).toBeUndefined();
  });
});
