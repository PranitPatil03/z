import { requestData, requestDataWithInit, toQueryString } from "./_shared";

export type BudgetEntryType = "committed" | "actual" | "billed";

export type BudgetEntrySourceType =
  | "change_order"
  | "purchase_order"
  | "invoice"
  | "payment_application"
  | "manual"
  | "other";

export interface BudgetMetrics {
  budgetMinusCommittedCents: number;
  committedMinusActualCents: number;
  budgetMinusActualCents: number;
  varianceBps: number;
  billedPercentOfCommittedBps: number;
}

export interface BudgetCostCode {
  id: string;
  organizationId: string;
  projectId: string;
  code: string;
  name: string;
  budgetCents: number;
  committedCents: number;
  actualCents: number;
  billedCents: number;
  alertThresholdBps: number;
  createdAt: string;
  updatedAt: string;
  metrics: BudgetMetrics;
  effectiveAlertThresholdBps?: number;
}

export interface BudgetProjectSettings {
  id?: string;
  organizationId?: string;
  projectId: string;
  alertThresholdBps: number;
  source?: "default" | "project";
  createdAt?: string;
  updatedAt?: string;
}

export interface BudgetAlert {
  id: string;
  organizationId: string;
  projectId: string;
  costCodeId: string;
  severity: string;
  narrative: string;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface BudgetCostEntry {
  id: string;
  organizationId: string;
  projectId: string;
  costCodeId: string;
  entryType: BudgetEntryType;
  sourceType: BudgetEntrySourceType;
  sourceId?: string | null;
  sourceRef?: string | null;
  amountCents: number;
  currency: string;
  occurredAt: string;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetVarianceResponse {
  totals: {
    budgetCents: number;
    actualCents: number;
    committedCents: number;
    billedCents: number;
  };
  metrics: BudgetMetrics;
  projectAlertThresholdBps: number;
  byCostCode: BudgetCostCode[];
}

export interface BudgetReconciliationItem {
  id: string;
  code: string;
  name: string;
  budgetCents: number;
  committedCents: number;
  actualCents: number;
  billedCents: number;
  metrics: BudgetMetrics;
  effectiveAlertThresholdBps: number;
  entryStats: {
    count: number;
    committed: number;
    actual: number;
    billed: number;
  };
  latestAlert: BudgetAlert | null;
}

export interface BudgetReconciliationResponse {
  items: BudgetReconciliationItem[];
  projectAlertThresholdBps: number;
  alerts: BudgetAlert[];
  unresolvedAlertCount: number;
  entryCount: number;
}

export interface BudgetDrilldownEntry extends BudgetCostEntry {
  sourceEntity: Record<string, unknown> | null;
}

export interface BudgetDrilldownResponse {
  costCode: BudgetCostCode;
  entryTotals: {
    committedCents: number;
    actualCents: number;
    billedCents: number;
  };
  entries: BudgetDrilldownEntry[];
  alerts: BudgetAlert[];
}

export interface CreateBudgetCostCodeInput {
  projectId: string;
  code: string;
  name: string;
  budgetCents: number;
  alertThresholdBps?: number;
}

export interface UpdateBudgetCostCodeInput {
  name?: string;
  budgetCents?: number;
  committedCents?: number;
  actualCents?: number;
  billedCents?: number;
  alertThresholdBps?: number;
}

export interface CreateBudgetCostEntryInput {
  projectId: string;
  entryType: BudgetEntryType;
  sourceType: BudgetEntrySourceType;
  sourceId?: string;
  sourceRef?: string;
  amountCents: number;
  occurredAt?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface QueueNarrativesResponse {
  queued: number;
  jobs: Array<{
    costCodeId: string;
    code: string;
    jobId: string;
  }>;
}

export interface DeduplicateAlertsResponse {
  checked: number;
  duplicatesRemoved: number;
}

export const budgetsApi = {
  listCostCodes: (projectId: string) =>
    requestData<BudgetCostCode[]>(
      `/budgets/cost-codes${toQueryString({ projectId })}`,
    ),

  createCostCode: (body: CreateBudgetCostCodeInput) =>
    requestDataWithInit<BudgetCostCode>("/budgets/cost-codes", {
      method: "POST",
      body,
    }),

  updateCostCode: (costCodeId: string, body: UpdateBudgetCostCodeInput) =>
    requestDataWithInit<BudgetCostCode>(`/budgets/cost-codes/${costCodeId}`, {
      method: "PATCH",
      body,
    }),

  listCostCodeEntries: (
    costCodeId: string,
    params: {
      projectId: string;
      entryType?: BudgetEntryType;
      sourceType?: BudgetEntrySourceType;
      limit?: number;
    },
  ) =>
    requestData<BudgetCostEntry[]>(
      `/budgets/cost-codes/${costCodeId}/entries${toQueryString(params)}`,
    ),

  createCostCodeEntry: (costCodeId: string, body: CreateBudgetCostEntryInput) =>
    requestDataWithInit<{
      entry: BudgetCostEntry;
      costCode: BudgetCostCode;
      metrics: BudgetMetrics;
      effectiveAlertThresholdBps: number;
      thresholdAlert: BudgetAlert | null;
    }>(`/budgets/cost-codes/${costCodeId}/entries`, {
      method: "POST",
      body,
    }),

  getDrilldown: (
    costCodeId: string,
    params: { projectId: string; limit?: number },
  ) =>
    requestData<BudgetDrilldownResponse>(
      `/budgets/cost-codes/${costCodeId}/drilldown${toQueryString(params)}`,
    ),

  getVariance: (projectId: string) =>
    requestData<BudgetVarianceResponse>(
      `/budgets/variance${toQueryString({ projectId })}`,
    ),

  getReconciliation: (projectId: string) =>
    requestData<BudgetReconciliationResponse>(
      `/budgets/reconciliation${toQueryString({ projectId })}`,
    ),

  getSettings: (projectId: string) =>
    requestData<BudgetProjectSettings>(
      `/budgets/settings${toQueryString({ projectId })}`,
    ),

  upsertSettings: (body: { projectId: string; alertThresholdBps: number }) =>
    requestDataWithInit<BudgetProjectSettings>("/budgets/settings", {
      method: "PUT",
      body,
    }),

  queueNarratives: (projectId: string) =>
    requestDataWithInit<QueueNarrativesResponse>("/budgets/narratives/queue", {
      method: "POST",
      body: { projectId },
    }),

  deduplicateAlerts: (projectId: string, maxAgeHours = 24) =>
    requestDataWithInit<DeduplicateAlertsResponse>(
      "/budgets/alerts/deduplicate",
      {
        method: "POST",
        body: { projectId, maxAgeHours },
      },
    ),
};
