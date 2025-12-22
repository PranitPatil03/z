import { requestData, requestDataWithInit, toQueryString } from "./_shared";

export interface Notification {
  id: string;
  organizationId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  defaults: {
    inApp: boolean;
    email: boolean;
  };
  events: Record<
    string,
    {
      inApp: boolean;
      email: boolean;
    }
  >;
  updatedAt: string | null;
}

export interface ActivityFeedItem {
  id: string;
  type: string;
  entity: string;
  entityId: string;
  actor: string;
  projectId: string | null;
  timestamp: string;
  changes: {
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
  } | null;
  description: string;
}

export interface OffsetPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ActivityFeedResponse {
  items: ActivityFeedItem[];
  pagination: OffsetPagination;
  filters: {
    entityType: string | null;
    action: string | null;
    actorUserId: string | null;
    projectId: string | null;
    from: string | null;
    to: string | null;
  };
}

export interface ActivityTimelineResponse {
  entity: {
    entityType: string;
    entityId: string;
  };
  items: ActivityFeedItem[];
  pagination: OffsetPagination;
  filters: {
    action: string | null;
    from: string | null;
    to: string | null;
  };
}

export interface CommandCenterOverview {
  projectId: string;
  windowDays: number;
  summary: {
    changeOrders: number;
    openChangeOrders: number;
    changeOrderVelocityBps: number;
    budgetAlerts: number;
    highRiskBudgetAlerts: number;
    budgetTotalCents: number;
    actualCostCents: number;
    budgetBurnBps: number;
    siteSnaps: number;
    reviewedSiteSnaps: number;
    reviewedSiteSnapRateBps: number;
    smartMailThreads: number;
    recentSmartMailThreads: number;
    invoices: number;
    matchRuns: number;
    completedMatchRuns: number;
    matchSuccessRateBps: number;
    overdueComplianceItems: number;
    nonCompliantComplianceItems: number;
    pendingPayApplications: number;
    pendingPayApplicationAverageAgeDays: number;
  };
  breakdown: {
    changeOrderByStatus: Record<string, number>;
    complianceByStatus: Record<string, number>;
  };
  healthInputs: {
    budgetBurnBps: number;
    highRiskAlertCount: number;
    openChangeOrderCount: number;
    overdueComplianceCount: number;
    pendingPayApplicationCount: number;
    pendingPayApplicationAverageAgeDays: number;
    reviewedSiteSnapRateBps: number;
  };
}

export interface CommandCenterHealth {
  projectId: string;
  windowDays: number;
  score: number;
  scoreBps: number;
  status: "healthy" | "watch" | "critical";
  factors: Array<{
    key: string;
    label: string;
    impactBps: number;
    value: number;
  }>;
  metrics: {
    budgetBurnPercent: number;
    openChangeOrders: number;
    highRiskBudgetAlerts: number;
    overdueComplianceItems: number;
    pendingPayApplications: number;
    pendingPayApplicationAverageAgeDays: number;
    reviewedSiteSnapRatePercent: number;
    matchSuccessRatePercent: number;
  };
}

export interface CommandCenterPortfolio {
  windowDays: number;
  generatedAt: string;
  projectCount: number;
  averageHealthScore: number;
  criticalProjects: number;
  watchProjects: number;
  topRisks: Array<{
    projectId: string;
    projectCode: string;
    projectName: string;
    score: number;
    status: "healthy" | "watch" | "critical";
  }>;
  projects: Array<{
    projectId: string;
    projectCode: string;
    projectName: string;
    projectStatus: string;
    health: {
      score: number;
      scoreBps: number;
      status: "healthy" | "watch" | "critical";
    };
    summary: {
      budgetBurnPercent: number;
      openChangeOrders: number;
      highRiskBudgetAlerts: number;
      overdueComplianceItems: number;
      pendingPayApplications: number;
    };
    topRiskFactors: Array<{
      key: string;
      label: string;
      impactBps: number;
      value: number;
    }>;
  }>;
}

export interface CommandCenterTrends {
  projectId: string;
  windowDays: number;
  interval: "day" | "week";
  generatedAt: string;
  summary: {
    submittedChangeOrders: number;
    resolvedChangeOrders: number;
    highRiskBudgetAlerts: number;
    reviewedSiteSnaps: number;
    submittedPayApplications: number;
    averageRiskPressure: number;
    trendDirection: "improving" | "degrading" | "stable";
    pressureDelta: number;
  };
  series: Array<{
    period: string;
    submittedChangeOrders: number;
    resolvedChangeOrders: number;
    highRiskBudgetAlerts: number;
    reviewedSiteSnaps: number;
    submittedPayApplications: number;
    riskPressureScore: number;
  }>;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    count: number;
  };
}

export interface AuditLogItem {
  id: string;
  organizationId: string;
  actorUserId: string;
  entityType: string;
  entityId: string;
  action: string;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export const notificationsApi = {
  list: () => requestData<Notification[]>("/notifications"),

  unreadCount: () =>
    requestData<{ unreadCount: number }>("/notifications/unread-count"),

  getPreferences: () =>
    requestData<NotificationPreferences>("/notifications/preferences"),

  updatePreferences: (body: {
    defaults?: { inApp: boolean; email: boolean };
    events?: Record<string, { inApp: boolean; email: boolean }>;
  }) =>
    requestDataWithInit<NotificationPreferences>("/notifications/preferences", {
      method: "PUT",
      body,
    }),

  markRead: (id: string) =>
    requestDataWithInit<Notification>(`/notifications/${id}/read`, {
      method: "PATCH",
    }),

  async markAllRead(notificationIds: string[]) {
    if (notificationIds.length === 0) {
      return [] as Notification[];
    }

    return await Promise.all(
      notificationIds.map((id) => notificationsApi.markRead(id)),
    );
  },

  delete: (id: string) =>
    requestDataWithInit<Notification>(`/notifications/${id}`, {
      method: "DELETE",
    }),
};

export const activityFeedApi = {
  list: (params?: {
    page?: number;
    pageSize?: number;
    entityType?: string;
    actorUserId?: string;
    projectId?: string;
    action?: string;
    from?: string;
    to?: string;
  }) => {
    const qs = toQueryString(params);
    return requestData<ActivityFeedResponse>(`/activity-feed${qs}`);
  },

  timeline: (
    entityType: string,
    entityId: string,
    params?: {
      page?: number;
      pageSize?: number;
      action?: string;
      from?: string;
      to?: string;
    },
  ) => {
    const qs = toQueryString(params);
    return requestData<ActivityTimelineResponse>(
      `/activity-feed/entity/${entityType}/${entityId}${qs}`,
    );
  },

  healthScore: () => requestData("/activity-feed/health"),

  projectHealth: (projectId: string) =>
    requestData(`/activity-feed/health/project/${projectId}`),
};

export const commandCenterApi = {
  overview: (projectId: string, windowDays = 30) =>
    requestData<CommandCenterOverview>(
      `/command-center/overview${toQueryString({ projectId, windowDays })}`,
    ),

  health: (projectId: string, windowDays = 30) =>
    requestData<CommandCenterHealth>(
      `/command-center/health${toQueryString({ projectId, windowDays })}`,
    ),

  portfolio: (params?: { limit?: number; windowDays?: number }) =>
    requestData<CommandCenterPortfolio>(
      `/command-center/portfolio${toQueryString(params)}`,
    ),

  trends: (params: {
    projectId: string;
    windowDays?: number;
    interval?: "day" | "week";
  }) =>
    requestData<CommandCenterTrends>(
      `/command-center/trends${toQueryString(params)}`,
    ),
};

export const auditLogApi = {
  list: (params?: {
    cursor?: string;
    limit?: number;
    direction?: "forward" | "backward";
    entityType?: string;
    entityId?: string;
    actorUserId?: string;
    action?: string;
    from?: string;
    to?: string;
  }) => {
    const qs = toQueryString(params);
    return requestData<CursorPaginatedResponse<AuditLogItem>>(
      `/audit-log${qs}`,
    );
  },
};
