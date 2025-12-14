export const queryKeys = {
  system: {
    info: ["system", "info"] as const,
    health: ["system", "health"] as const,
    readiness: ["system", "readiness"] as const,
    openapi: ["system", "openapi"] as const,
  },

  // M2 Workspace
  organizations: {
    all: ["organizations"] as const,
    list: () => [...queryKeys.organizations.all, "list"] as const,
    detail: (id: string) => [...queryKeys.organizations.all, id] as const,
    members: (id: string) =>
      [...queryKeys.organizations.all, id, "members"] as const,
  },
  projects: {
    all: ["projects"] as const,
    list: (params?: object) =>
      [...queryKeys.projects.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.projects.all, id] as const,
    members: (id: string) =>
      [...queryKeys.projects.all, id, "members"] as const,
  },

  // M3 Ops Intelligence
  notifications: {
    all: ["notifications"] as const,
    list: (params?: object) =>
      [...queryKeys.notifications.all, "list", params] as const,
    unreadCount: () =>
      [...queryKeys.notifications.all, "unread-count"] as const,
    preferences: () => [...queryKeys.notifications.all, "preferences"] as const,
  },
  activityFeed: {
    all: ["activity-feed"] as const,
    list: (params?: object) =>
      [...queryKeys.activityFeed.all, "list", params] as const,
    timeline: (entityType: string, entityId: string, params?: object) =>
      [
        ...queryKeys.activityFeed.all,
        "timeline",
        entityType,
        entityId,
        params,
      ] as const,
  },
  commandCenter: {
    all: ["command-center"] as const,
    overview: (projectId: string, windowDays: number) =>
      [
        ...queryKeys.commandCenter.all,
        "overview",
        projectId,
        windowDays,
      ] as const,
    health: (projectId: string, windowDays: number) =>
      [
        ...queryKeys.commandCenter.all,
        "health",
        projectId,
        windowDays,
      ] as const,
    portfolio: (params?: object) =>
      [...queryKeys.commandCenter.all, "portfolio", params] as const,
    trends: (params: object) =>
      [...queryKeys.commandCenter.all, "trends", params] as const,
  },
  auditLog: {
    all: ["audit-log"] as const,
    list: (params?: object) =>
      [...queryKeys.auditLog.all, "list", params] as const,
  },

  // M4 Procurement & AP
  invoices: {
    all: ["invoices"] as const,
    list: (params?: object) =>
      [...queryKeys.invoices.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.invoices.all, id] as const,
  },
  purchaseOrders: {
    all: ["purchase-orders"] as const,
    list: (params?: object) =>
      [...queryKeys.purchaseOrders.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.purchaseOrders.all, id] as const,
  },
  rfqs: {
    all: ["rfqs"] as const,
    list: (params?: object) => [...queryKeys.rfqs.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.rfqs.all, id] as const,
  },
  receipts: {
    all: ["receipts"] as const,
    list: (params?: object) =>
      [...queryKeys.receipts.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.receipts.all, id] as const,
  },
  matchRuns: {
    all: ["match-runs"] as const,
    list: (params?: object) =>
      [...queryKeys.matchRuns.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.matchRuns.all, id] as const,
  },

  // M5 Change Orders
  changeOrders: {
    all: ["change-orders"] as const,
    list: (params: { projectId: string }) =>
      [...queryKeys.changeOrders.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.changeOrders.all, id] as const,
    attachments: (id: string) =>
      [...queryKeys.changeOrders.all, id, "attachments"] as const,
  },

  // M6 Budgets
  budgets: {
    all: ["budgets"] as const,
    costCodes: (projectId: string) =>
      [...queryKeys.budgets.all, "cost-codes", projectId] as const,
    variance: (projectId: string) =>
      [...queryKeys.budgets.all, "variance", projectId] as const,
    reconciliation: (projectId: string) =>
      [...queryKeys.budgets.all, "reconciliation", projectId] as const,
    settings: (projectId: string) =>
      [...queryKeys.budgets.all, "settings", projectId] as const,
    entries: (costCodeId: string, params: object) =>
      [...queryKeys.budgets.all, "entries", costCodeId, params] as const,
    drilldown: (costCodeId: string, params: object) =>
      [...queryKeys.budgets.all, "drilldown", costCodeId, params] as const,
  },

  // M7 SiteSnap
  siteSnaps: {
    all: ["site-snaps"] as const,
    list: (params?: object) =>
      [...queryKeys.siteSnaps.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.siteSnaps.all, id] as const,
    observations: (id: string) =>
      [...queryKeys.siteSnaps.all, id, "observations"] as const,
    dailyProgress: (projectId: string, day?: string) =>
      [...queryKeys.siteSnaps.all, "daily-progress", projectId, day] as const,
  },

  storage: {
    all: ["storage"] as const,
    list: (entityType: string, entityId: string) =>
      [...queryKeys.storage.all, "list", entityType, entityId] as const,
    downloadUrl: (fileAssetId: string) =>
      [...queryKeys.storage.all, "download-url", fileAssetId] as const,
  },

  ai: {
    all: ["ai"] as const,
    job: (jobId: string) => [...queryKeys.ai.all, "job", jobId] as const,
  },

  // M8 SubConnect
  subcontractors: {
    all: ["subcontractors"] as const,
    list: (params?: object) =>
      [...queryKeys.subcontractors.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.subcontractors.all, id] as const,
    invitations: (params?: object) =>
      [...queryKeys.subcontractors.all, "invitations", params] as const,
  },
  compliance: {
    all: ["compliance"] as const,
    list: (params?: object) =>
      [...queryKeys.compliance.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.compliance.all, id] as const,
  },
  subconnect: {
    all: ["subconnect"] as const,
    invitations: (params?: object) =>
      [...queryKeys.subconnect.all, "invitations", params] as const,
    complianceTemplates: (projectId: string) =>
      [...queryKeys.subconnect.all, "compliance-templates", projectId] as const,
    prequalification: (subcontractorId: string) =>
      [
        ...queryKeys.subconnect.all,
        "prequalification",
        subcontractorId,
      ] as const,
    payApplications: (params?: object) =>
      [...queryKeys.subconnect.all, "pay-applications", params] as const,
    payApplicationDetail: (payApplicationId: string) =>
      [
        ...queryKeys.subconnect.all,
        "pay-applications",
        payApplicationId,
      ] as const,
    dailyLogs: (params?: object) =>
      [...queryKeys.subconnect.all, "daily-logs", params] as const,
    dailyLogDetail: (dailyLogId: string) =>
      [...queryKeys.subconnect.all, "daily-logs", dailyLogId] as const,
  },

  // M10 SmartMail
  smartmailAccounts: {
    all: ["smartmail-accounts"] as const,
    list: () => [...queryKeys.smartmailAccounts.all, "list"] as const,
  },
  smartmailThreads: {
    all: ["smartmail-threads"] as const,
    list: (params?: object) =>
      [...queryKeys.smartmailThreads.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.smartmailThreads.all, id] as const,
  },
  smartmailMessages: {
    all: ["smartmail-messages"] as const,
    list: (threadId: string) =>
      [...queryKeys.smartmailMessages.all, "list", threadId] as const,
  },
  smartmailTemplates: {
    all: ["smartmail-templates"] as const,
    list: (params?: object) =>
      [...queryKeys.smartmailTemplates.all, "list", params] as const,
    detail: (id: string) =>
      [...queryKeys.smartmailTemplates.all, "detail", id] as const,
  },
  integrations: {
    all: ["integrations"] as const,
    list: () => [...queryKeys.integrations.all, "list"] as const,
    detail: (id: string) => [...queryKeys.integrations.all, id] as const,
  },

  // M11 Billing
  billing: {
    all: ["billing"] as const,
    list: (params?: object) =>
      [...queryKeys.billing.all, "list", params] as const,
    detail: (billingRecordId: string) =>
      [...queryKeys.billing.all, "detail", billingRecordId] as const,
    usage: () => [...queryKeys.billing.all, "usage"] as const,
    plans: () => [...queryKeys.billing.all, "plans"] as const,
    subscription: () => [...queryKeys.billing.all, "subscription"] as const,
    webhookEvents: (params?: object) =>
      [...queryKeys.billing.all, "webhook-events", params] as const,
  },

  // M1 Identity, Session, and Route Protection
  authz: {
    all: ["authz"] as const,
    activeRole: (organizationId?: string) =>
      [...queryKeys.authz.all, "active-role", organizationId] as const,
    permission: (permissionKey: string, projectId?: string) =>
      [...queryKeys.authz.all, "permission", permissionKey, projectId] as const,
  },
  portal: {
    all: ["portal"] as const,
    profile: () => [...queryKeys.portal.all, "profile"] as const,
    overview: () => [...queryKeys.portal.all, "overview"] as const,
    compliance: () => [...queryKeys.portal.all, "compliance"] as const,
    payApplications: {
      all: ["portal", "pay-applications"] as const,
      list: (params?: object) =>
        [...queryKeys.portal.payApplications.all, "list", params] as const,
      detail: (id: string) =>
        [...queryKeys.portal.payApplications.all, id] as const,
    },
    dailyLogs: {
      all: ["portal", "daily-logs"] as const,
      list: (params?: object) =>
        [...queryKeys.portal.dailyLogs.all, "list", params] as const,
      detail: (id: string) => [...queryKeys.portal.dailyLogs.all, id] as const,
    },
  },
};
