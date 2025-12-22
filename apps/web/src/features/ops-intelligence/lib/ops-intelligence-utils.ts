export interface PortfolioSummaryShape {
  summary: {
    openChangeOrders: number;
    highRiskBudgetAlerts: number;
    overdueComplianceItems: number;
    pendingPayApplications: number;
  };
}

export interface PortfolioRollup {
  openChangeOrders: number;
  highRiskBudgetAlerts: number;
  overdueComplianceItems: number;
  pendingPayApplications: number;
}

export function summarizePortfolioProjects(
  projects: PortfolioSummaryShape[],
): PortfolioRollup {
  return projects.reduce<PortfolioRollup>(
    (acc, project) => {
      acc.openChangeOrders += project.summary.openChangeOrders;
      acc.highRiskBudgetAlerts += project.summary.highRiskBudgetAlerts;
      acc.overdueComplianceItems += project.summary.overdueComplianceItems;
      acc.pendingPayApplications += project.summary.pendingPayApplications;
      return acc;
    },
    {
      openChangeOrders: 0,
      highRiskBudgetAlerts: 0,
      overdueComplianceItems: 0,
      pendingPayApplications: 0,
    },
  );
}

export interface ActivityFilterInput {
  page: number;
  pageSize: number;
  entityType?: string;
  projectId?: string;
  action?: string;
  from?: string;
  to?: string;
}

function toIsoIfValid(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

export function buildActivityFilters(input: ActivityFilterInput) {
  return {
    page: input.page,
    pageSize: input.pageSize,
    entityType: input.entityType || undefined,
    projectId: input.projectId || undefined,
    action: input.action || undefined,
    from: toIsoIfValid(input.from),
    to: toIsoIfValid(input.to),
  };
}
