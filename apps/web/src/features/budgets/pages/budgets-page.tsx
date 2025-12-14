"use client";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  bpsToPercent,
  computeVariancePercent,
  isVarianceAtRisk,
  summarizeReconciliation,
} from "@/features/budgets/lib/budgets-utils";
import {
  type BudgetCostCode,
  type BudgetCostEntry,
  type BudgetEntrySourceType,
  type BudgetEntryType,
  budgetsApi,
} from "@/lib/api/modules/budgets-api";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  ClipboardList,
  GitMerge,
  Loader2,
  Plus,
  Save,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const ENTRY_TYPES: BudgetEntryType[] = ["committed", "actual", "billed"];

const ENTRY_SOURCE_TYPES: BudgetEntrySourceType[] = [
  "change_order",
  "purchase_order",
  "invoice",
  "payment_application",
  "manual",
  "other",
];

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDateTime(value?: string | null) {
  if (!value) {
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

function toDateTimeInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 16);
}

export function BudgetsPage() {
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [selectedCostCodeId, setSelectedCostCodeId] = useState("");

  const [settingsThresholdBps, setSettingsThresholdBps] = useState("500");

  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [entryDrawerOpen, setEntryDrawerOpen] = useState(false);

  const [costCodeForm, setCostCodeForm] = useState({
    code: "",
    name: "",
    budget: "0",
    thresholdBps: "500",
  });

  const [entryForm, setEntryForm] = useState({
    entryType: "committed" as BudgetEntryType,
    sourceType: "manual" as BudgetEntrySourceType,
    sourceId: "",
    sourceRef: "",
    amount: "0",
    occurredAt: "",
    notes: "",
  });

  const [entryTypeFilter, setEntryTypeFilter] = useState<BudgetEntryType | "">(
    "",
  );
  const [sourceTypeFilter, setSourceTypeFilter] = useState<
    BudgetEntrySourceType | ""
  >("");

  const normalizedProjectId = projectId.trim();

  const costCodesQuery = useQuery({
    queryKey: queryKeys.budgets.costCodes(normalizedProjectId),
    queryFn: () => budgetsApi.listCostCodes(normalizedProjectId),
    enabled: normalizedProjectId.length > 0,
  });

  const varianceQuery = useQuery({
    queryKey: queryKeys.budgets.variance(normalizedProjectId),
    queryFn: () => budgetsApi.getVariance(normalizedProjectId),
    enabled: normalizedProjectId.length > 0,
  });

  const reconciliationQuery = useQuery({
    queryKey: queryKeys.budgets.reconciliation(normalizedProjectId),
    queryFn: () => budgetsApi.getReconciliation(normalizedProjectId),
    enabled: normalizedProjectId.length > 0,
  });

  const settingsQuery = useQuery({
    queryKey: queryKeys.budgets.settings(normalizedProjectId),
    queryFn: () => budgetsApi.getSettings(normalizedProjectId),
    enabled: normalizedProjectId.length > 0,
  });

  const entriesQuery = useQuery({
    queryKey: queryKeys.budgets.entries(selectedCostCodeId, {
      projectId: normalizedProjectId,
      entryType: entryTypeFilter || undefined,
      sourceType: sourceTypeFilter || undefined,
      limit: 50,
    }),
    queryFn: () =>
      budgetsApi.listCostCodeEntries(selectedCostCodeId, {
        projectId: normalizedProjectId,
        entryType: entryTypeFilter || undefined,
        sourceType: sourceTypeFilter || undefined,
        limit: 50,
      }),
    enabled: normalizedProjectId.length > 0 && selectedCostCodeId.length > 0,
  });

  const drilldownQuery = useQuery({
    queryKey: queryKeys.budgets.drilldown(selectedCostCodeId, {
      projectId: normalizedProjectId,
      limit: 25,
    }),
    queryFn: () =>
      budgetsApi.getDrilldown(selectedCostCodeId, {
        projectId: normalizedProjectId,
        limit: 25,
      }),
    enabled: normalizedProjectId.length > 0 && selectedCostCodeId.length > 0,
  });

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    setSettingsThresholdBps(String(settingsQuery.data.alertThresholdBps));
  }, [settingsQuery.data]);

  useEffect(() => {
    const first = costCodesQuery.data?.[0];
    if (!first) {
      return;
    }

    if (selectedCostCodeId.length === 0) {
      setSelectedCostCodeId(first.id);
    }
  }, [costCodesQuery.data, selectedCostCodeId.length]);

  const selectedCostCode = useMemo(
    () =>
      (costCodesQuery.data ?? []).find(
        (item) => item.id === selectedCostCodeId,
      ) ?? null,
    [costCodesQuery.data, selectedCostCodeId],
  );

  useEffect(() => {
    if (!selectedCostCode || !editDrawerOpen) {
      return;
    }

    setCostCodeForm({
      code: selectedCostCode.code,
      name: selectedCostCode.name,
      budget: (selectedCostCode.budgetCents / 100).toFixed(2),
      thresholdBps: String(selectedCostCode.alertThresholdBps),
    });
  }, [editDrawerOpen, selectedCostCode]);

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
  };

  const createCostCodeMutation = useMutation({
    mutationFn: () =>
      budgetsApi.createCostCode({
        projectId: normalizedProjectId,
        code: costCodeForm.code.trim(),
        name: costCodeForm.name.trim(),
        budgetCents: Math.round(Number.parseFloat(costCodeForm.budget) * 100),
        alertThresholdBps: Number.parseInt(costCodeForm.thresholdBps, 10),
      }),
    onSuccess: (record) => {
      toast.success("Cost code created");
      setCreateDrawerOpen(false);
      setSelectedCostCodeId(record.id);
      setCostCodeForm({
        code: "",
        name: "",
        budget: "0",
        thresholdBps: settingsThresholdBps,
      });
      refreshAll();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateCostCodeMutation = useMutation({
    mutationFn: () => {
      if (!selectedCostCode) {
        throw new Error("Select a cost code first");
      }

      return budgetsApi.updateCostCode(selectedCostCode.id, {
        name: costCodeForm.name.trim(),
        budgetCents: Math.round(Number.parseFloat(costCodeForm.budget) * 100),
        alertThresholdBps: Number.parseInt(costCodeForm.thresholdBps, 10),
      });
    },
    onSuccess: () => {
      toast.success("Cost code updated");
      setEditDrawerOpen(false);
      refreshAll();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: () => {
      if (!selectedCostCodeId) {
        throw new Error("Select a cost code first");
      }

      return budgetsApi.createCostCodeEntry(selectedCostCodeId, {
        projectId: normalizedProjectId,
        entryType: entryForm.entryType,
        sourceType: entryForm.sourceType,
        sourceId: entryForm.sourceId.trim() || undefined,
        sourceRef: entryForm.sourceRef.trim() || undefined,
        amountCents: Math.round(Number.parseFloat(entryForm.amount) * 100),
        occurredAt: entryForm.occurredAt
          ? new Date(entryForm.occurredAt).toISOString()
          : undefined,
        notes: entryForm.notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Cost entry added");
      setEntryDrawerOpen(false);
      setEntryForm((current) => ({
        ...current,
        sourceId: "",
        sourceRef: "",
        amount: "0",
        occurredAt: "",
        notes: "",
      }));
      refreshAll();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      budgetsApi.upsertSettings({
        projectId: normalizedProjectId,
        alertThresholdBps: Number.parseInt(settingsThresholdBps, 10),
      }),
    onSuccess: () => {
      toast.success("Project budget settings saved");
      refreshAll();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const queueNarrativesMutation = useMutation({
    mutationFn: () => budgetsApi.queueNarratives(normalizedProjectId),
    onSuccess: (result) => {
      toast.success(`Queued ${result.queued} narrative jobs`);
      refreshAll();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deduplicateMutation = useMutation({
    mutationFn: () => budgetsApi.deduplicateAlerts(normalizedProjectId, 24),
    onSuccess: (result) => {
      toast.success(`Removed ${result.duplicatesRemoved} duplicate alerts`);
      refreshAll();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const reconciliationSummary = summarizeReconciliation(
    reconciliationQuery.data?.items ?? [],
  );

  const costCodeColumns: DataTableColumn<BudgetCostCode>[] = [
    {
      key: "code",
      header: "Code",
      width: "120px",
      render: (row) => <span className="font-mono text-xs">{row.code}</span>,
    },
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <span className="font-medium text-foreground">{row.name}</span>
      ),
    },
    {
      key: "budget",
      header: "Budget",
      width: "120px",
      render: (row) => <span>{formatCents(row.budgetCents)}</span>,
    },
    {
      key: "committed",
      header: "Committed",
      width: "120px",
      render: (row) => <span>{formatCents(row.committedCents)}</span>,
    },
    {
      key: "actual",
      header: "Actual",
      width: "120px",
      render: (row) => <span>{formatCents(row.actualCents)}</span>,
    },
    {
      key: "variance",
      header: "Variance",
      width: "150px",
      render: (row) => {
        const variancePercent = computeVariancePercent(row.metrics);
        const threshold =
          row.effectiveAlertThresholdBps ?? row.alertThresholdBps;
        const atRisk = isVarianceAtRisk(row.metrics, threshold);

        return (
          <span
            className={cn(
              "font-medium",
              atRisk
                ? "text-red-700 dark:text-red-400"
                : "text-green-700 dark:text-green-400",
            )}
          >
            {variancePercent.toFixed(2)}%
          </span>
        );
      },
    },
  ];

  const entryColumns: DataTableColumn<BudgetCostEntry>[] = [
    {
      key: "type",
      header: "Type",
      width: "110px",
      render: (row) => (
        <span className="capitalize text-muted-foreground">
          {row.entryType}
        </span>
      ),
    },
    {
      key: "source",
      header: "Source",
      width: "190px",
      render: (row) => (
        <div>
          <p className="text-sm text-foreground">{row.sourceType}</p>
          <p className="text-xs text-muted-foreground">
            {row.sourceRef || row.sourceId || "manual"}
          </p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      width: "120px",
      render: (row) => <span>{formatCents(row.amountCents)}</span>,
    },
    {
      key: "occurredAt",
      header: "Occurred",
      width: "170px",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(row.occurredAt)}
        </span>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      render: (row) => (
        <span className="line-clamp-1 text-muted-foreground">
          {row.notes || "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description="Operate cost-code controls, entries, variance, and reconciliation."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Input
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          placeholder="Project ID (required)"
        />
        <Button
          variant="outline"
          onClick={() => refreshAll()}
          disabled={normalizedProjectId.length === 0}
        >
          Refresh
        </Button>
        <Button
          variant="outline"
          onClick={() => queueNarrativesMutation.mutate()}
          disabled={
            queueNarrativesMutation.isPending ||
            normalizedProjectId.length === 0
          }
        >
          {queueNarrativesMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <WandSparkles className="mr-2 h-4 w-4" />
          )}
          Queue narratives
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (window.confirm("Deduplicate alerts for this project?")) {
              deduplicateMutation.mutate();
            }
          }}
          disabled={
            deduplicateMutation.isPending || normalizedProjectId.length === 0
          }
        >
          {deduplicateMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GitMerge className="mr-2 h-4 w-4" />
          )}
          Deduplicate alerts
        </Button>
      </div>

      {normalizedProjectId.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Project scope required"
          description="Enter a project ID to load budgets from backend."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total budget"
              value={formatCents(varianceQuery.data?.totals.budgetCents ?? 0)}
              icon={BarChart3}
              isLoading={varianceQuery.isLoading}
            />
            <StatCard
              title="Actual spend"
              value={formatCents(varianceQuery.data?.totals.actualCents ?? 0)}
              icon={ClipboardList}
              isLoading={varianceQuery.isLoading}
            />
            <StatCard
              title="Variance"
              value={`${bpsToPercent(varianceQuery.data?.metrics.varianceBps ?? 0).toFixed(2)}%`}
              icon={AlertTriangle}
              isLoading={varianceQuery.isLoading}
            />
            <StatCard
              title="Unresolved alerts"
              value={reconciliationQuery.data?.unresolvedAlertCount ?? 0}
              subtitle={`${reconciliationSummary.overBudget} over-budget codes`}
              icon={Bot}
              isLoading={reconciliationQuery.isLoading}
            />
          </div>

          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">
                Project budget settings
              </h2>
              <Button
                onClick={() => saveSettingsMutation.mutate()}
                disabled={saveSettingsMutation.isPending}
              >
                {saveSettingsMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save settings
              </Button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Alert threshold (bps)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10000"
                  value={settingsThresholdBps}
                  onChange={(event) =>
                    setSettingsThresholdBps(event.target.value)
                  }
                />
              </div>
              <div className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
                Effective project threshold:{" "}
                {(Number(settingsThresholdBps) / 100).toFixed(2)}%
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">
                Cost codes
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditDrawerOpen(true)}
                  disabled={!selectedCostCode}
                >
                  Edit selected
                </Button>
                <Button onClick={() => setCreateDrawerOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add cost code
                </Button>
              </div>
            </div>
            <DataTable
              columns={costCodeColumns}
              data={costCodesQuery.data ?? []}
              isLoading={costCodesQuery.isLoading}
              rowKey={(row) => row.id}
              onRowClick={(row) => setSelectedCostCodeId(row.id)}
              emptyState={
                <EmptyState
                  title="No cost codes"
                  description="Create a cost code to begin budget tracking."
                  icon={BarChart3}
                />
              }
            />
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">
                Cost entries{" "}
                {selectedCostCode ? `• ${selectedCostCode.code}` : ""}
              </h2>
              <div className="flex items-center gap-2">
                <Select
                  value={entryTypeFilter}
                  onChange={(event) =>
                    setEntryTypeFilter(
                      event.target.value as BudgetEntryType | "",
                    )
                  }
                  placeholder="All entry types"
                  className="w-44"
                >
                  {ENTRY_TYPES.map((entryType) => (
                    <option key={entryType} value={entryType}>
                      {entryType}
                    </option>
                  ))}
                </Select>
                <Select
                  value={sourceTypeFilter}
                  onChange={(event) =>
                    setSourceTypeFilter(
                      event.target.value as BudgetEntrySourceType | "",
                    )
                  }
                  placeholder="All source types"
                  className="w-52"
                >
                  {ENTRY_SOURCE_TYPES.map((sourceType) => (
                    <option key={sourceType} value={sourceType}>
                      {sourceType}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEntryTypeFilter("");
                    setSourceTypeFilter("");
                  }}
                >
                  Clear filters
                </Button>
                <Button
                  onClick={() => setEntryDrawerOpen(true)}
                  disabled={!selectedCostCode}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add entry
                </Button>
              </div>
            </div>
            <DataTable
              columns={entryColumns}
              data={entriesQuery.data ?? []}
              isLoading={entriesQuery.isLoading}
              rowKey={(row) => row.id}
              emptyState={
                <EmptyState
                  title="No entries"
                  description="Add committed/actual/billed entries for the selected cost code."
                  icon={ClipboardList}
                />
              }
            />
          </section>

          {selectedCostCode && drilldownQuery.data && (
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 text-base font-semibold text-foreground">
                Drilldown
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-border px-3 py-2">
                  <p className="text-xs text-muted-foreground">Committed</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {formatCents(
                      drilldownQuery.data.entryTotals.committedCents,
                    )}
                  </p>
                </div>
                <div className="rounded-lg border border-border px-3 py-2">
                  <p className="text-xs text-muted-foreground">Actual</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {formatCents(drilldownQuery.data.entryTotals.actualCents)}
                  </p>
                </div>
                <div className="rounded-lg border border-border px-3 py-2">
                  <p className="text-xs text-muted-foreground">Billed</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {formatCents(drilldownQuery.data.entryTotals.billedCents)}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Recent alerts
                </h3>
                {drilldownQuery.data.alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No alerts for this cost code.
                  </p>
                ) : (
                  drilldownQuery.data.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <div>
                        <p className="text-sm text-foreground">
                          {alert.narrative}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(alert.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={alert.severity} />
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {reconciliationQuery.data && (
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 text-base font-semibold text-foreground">
                Reconciliation
              </h2>
              <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-md bg-muted px-2 py-1">
                  {reconciliationSummary.total} cost codes
                </span>
                <span className="rounded-md bg-muted px-2 py-1">
                  {reconciliationSummary.unresolvedAlerts} unresolved alerts
                </span>
                <span className="rounded-md bg-muted px-2 py-1">
                  {reconciliationQuery.data.entryCount} entries
                </span>
              </div>
              <div className="space-y-2">
                {reconciliationQuery.data.items.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.code} • {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Variance{" "}
                        {bpsToPercent(item.metrics.varianceBps).toFixed(2)}% •
                        Entries {item.entryStats.count}
                      </p>
                    </div>
                    {item.latestAlert ? (
                      <StatusBadge status={item.latestAlert.severity} />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No alert
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <FormDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        title="Create cost code"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createCostCodeMutation.mutate()}
              disabled={
                createCostCodeMutation.isPending ||
                costCodeForm.code.trim().length === 0 ||
                costCodeForm.name.trim().length < 2
              }
            >
              {createCostCodeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input
              value={costCodeForm.code}
              onChange={(event) =>
                setCostCodeForm((current) => ({
                  ...current,
                  code: event.target.value,
                }))
              }
              placeholder="03-1000"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={costCodeForm.name}
              onChange={(event) =>
                setCostCodeForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Concrete"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Budget (USD)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={costCodeForm.budget}
              onChange={(event) =>
                setCostCodeForm((current) => ({
                  ...current,
                  budget: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Alert threshold (bps)</Label>
            <Input
              type="number"
              min="0"
              max="10000"
              value={costCodeForm.thresholdBps}
              onChange={(event) =>
                setCostCodeForm((current) => ({
                  ...current,
                  thresholdBps: event.target.value,
                }))
              }
            />
          </div>
        </div>
      </FormDrawer>

      <FormDrawer
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        title="Edit cost code"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateCostCodeMutation.mutate()}
              disabled={updateCostCodeMutation.isPending || !selectedCostCode}
            >
              {updateCostCodeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={costCodeForm.name}
              onChange={(event) =>
                setCostCodeForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Budget (USD)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={costCodeForm.budget}
              onChange={(event) =>
                setCostCodeForm((current) => ({
                  ...current,
                  budget: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Alert threshold (bps)</Label>
            <Input
              type="number"
              min="0"
              max="10000"
              value={costCodeForm.thresholdBps}
              onChange={(event) =>
                setCostCodeForm((current) => ({
                  ...current,
                  thresholdBps: event.target.value,
                }))
              }
            />
          </div>
        </div>
      </FormDrawer>

      <FormDrawer
        open={entryDrawerOpen}
        onClose={() => setEntryDrawerOpen(false)}
        title="Add cost entry"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEntryDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createEntryMutation.mutate()}
              disabled={
                createEntryMutation.isPending ||
                Number.isNaN(Number.parseFloat(entryForm.amount)) ||
                Number.parseFloat(entryForm.amount) === 0
              }
            >
              {createEntryMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add entry
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Entry type</Label>
            <Select
              value={entryForm.entryType}
              onChange={(event) =>
                setEntryForm((current) => ({
                  ...current,
                  entryType: event.target.value as BudgetEntryType,
                }))
              }
            >
              {ENTRY_TYPES.map((entryType) => (
                <option key={entryType} value={entryType}>
                  {entryType}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Source type</Label>
            <Select
              value={entryForm.sourceType}
              onChange={(event) =>
                setEntryForm((current) => ({
                  ...current,
                  sourceType: event.target.value as BudgetEntrySourceType,
                }))
              }
            >
              {ENTRY_SOURCE_TYPES.map((sourceType) => (
                <option key={sourceType} value={sourceType}>
                  {sourceType}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Amount (USD)</Label>
            <Input
              type="number"
              step="0.01"
              value={entryForm.amount}
              onChange={(event) =>
                setEntryForm((current) => ({
                  ...current,
                  amount: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Source ID</Label>
            <Input
              value={entryForm.sourceId}
              onChange={(event) =>
                setEntryForm((current) => ({
                  ...current,
                  sourceId: event.target.value,
                }))
              }
              placeholder="required for linked sources"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Source ref</Label>
            <Input
              value={entryForm.sourceRef}
              onChange={(event) =>
                setEntryForm((current) => ({
                  ...current,
                  sourceRef: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Occurred at</Label>
            <Input
              type="datetime-local"
              value={entryForm.occurredAt}
              onChange={(event) =>
                setEntryForm((current) => ({
                  ...current,
                  occurredAt: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input
              value={entryForm.notes}
              onChange={(event) =>
                setEntryForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}
