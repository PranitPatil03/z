"use client";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { type MatchRun, matchRunsApi } from "@/lib/api/modules/match-runs-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitCompareArrows, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

function formatCents(cents: number) {
  const absolute = Math.abs(cents);
  const value = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(absolute / 100);

  return cents < 0 ? `-${value}` : value;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MatchRunsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    projectId: "",
    invoiceId: "",
    purchaseOrderId: "",
    receiptId: "",
    toleranceBps: "0",
  });

  const query = useQuery({
    queryKey: queryKeys.matchRuns.list(),
    queryFn: () => matchRunsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      matchRunsApi.create({
        projectId: form.projectId,
        invoiceId: form.invoiceId,
        purchaseOrderId: form.purchaseOrderId || undefined,
        receiptId: form.receiptId || undefined,
        toleranceBps: Number.parseInt(form.toleranceBps, 10) || 0,
      }),
    onSuccess: () => {
      toast.success("Match run created");
      setDrawerOpen(false);
      setForm({
        projectId: "",
        invoiceId: "",
        purchaseOrderId: "",
        receiptId: "",
        toleranceBps: "0",
      });
      qc.invalidateQueries({ queryKey: queryKeys.matchRuns.all });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const columns: DataTableColumn<MatchRun>[] = [
    {
      key: "result",
      header: "Result",
      width: "170px",
      render: (row) => <StatusBadge status={row.result} />,
    },
    {
      key: "invoiceId",
      header: "Invoice",
      width: "180px",
      render: (row) => (
        <span className="font-mono text-xs">{row.invoiceId}</span>
      ),
    },
    {
      key: "purchaseOrderId",
      header: "PO",
      width: "180px",
      render: (row) => (
        <span className="font-mono text-xs">{row.purchaseOrderId || "—"}</span>
      ),
    },
    {
      key: "varianceCents",
      header: "Variance",
      width: "130px",
      render: (row) => <span>{formatCents(row.varianceCents)}</span>,
    },
    {
      key: "createdAt",
      header: "Created",
      width: "130px",
      render: (row) => (
        <span className="text-muted-foreground">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Match Runs"
        description="Run and review 3-way matching outcomes for AP controls."
        action={
          <Button size="sm" onClick={() => setDrawerOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New match run
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={query.data ?? []}
        isLoading={query.isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/match-runs/${row.id}`)}
        emptyState={
          <EmptyState
            icon={GitCompareArrows}
            title="No match runs"
            description="Create a match run to compare invoice, PO, and receipt values."
            action={{
              label: "New match run",
              onClick: () => setDrawerOpen(true),
            }}
          />
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Create match run"
        description="Compare invoice values against linked PO and receipt data."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                createMutation.isPending || !form.projectId || !form.invoiceId
              }
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create run
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Project ID *</Label>
            <Input
              value={form.projectId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  projectId: event.target.value,
                }))
              }
              placeholder="project-id"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Invoice ID *</Label>
            <Input
              value={form.invoiceId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  invoiceId: event.target.value,
                }))
              }
              placeholder="invoice-id"
            />
          </div>
          <div className="space-y-1.5">
            <Label>PO ID</Label>
            <Input
              value={form.purchaseOrderId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  purchaseOrderId: event.target.value,
                }))
              }
              placeholder="purchase-order-id"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Receipt ID</Label>
            <Input
              value={form.receiptId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  receiptId: event.target.value,
                }))
              }
              placeholder="receipt-id"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tolerance (bps)</Label>
            <Input
              type="number"
              min="0"
              max="5000"
              value={form.toleranceBps}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  toleranceBps: event.target.value,
                }))
              }
            />
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}
