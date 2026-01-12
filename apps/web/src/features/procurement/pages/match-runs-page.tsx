"use client";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-radix";
import { StatusBadge } from "@/components/ui/status-badge";
import { invoicesApi } from "@/lib/api/modules/invoices-api";
import { type MatchRun, matchRunsApi } from "@/lib/api/modules/match-runs-api";
import { projectsApi } from "@/lib/api/modules/projects-api";
import { purchaseOrdersApi } from "@/lib/api/modules/purchase-orders-api";
import { receiptsApi } from "@/lib/api/modules/receipts-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitCompareArrows, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const NO_PO_VALUE = "__no_po__";
const NO_RECEIPT_VALUE = "__no_receipt__";

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

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => projectsApi.list(),
  });

  const projectOptions = projectsQuery.data ?? [];

  function openCreateMatchRunDrawer() {
    const defaultProjectId = form.projectId || projectOptions[0]?.id || "";

    setDrawerOpen(true);
    setForm((current) => ({
      ...current,
      projectId: defaultProjectId,
      invoiceId: "",
      purchaseOrderId: "",
      receiptId: "",
      toleranceBps: "0",
    }));
  }

  useEffect(() => {
    if (form.projectId || projectOptions.length === 0) {
      return;
    }

    const defaultProjectId = projectOptions[0]?.id ?? "";
    if (!defaultProjectId) {
      return;
    }

    setForm((current) => ({
      ...current,
      projectId: defaultProjectId,
    }));
  }, [form.projectId, projectOptions]);

  const invoicesQuery = useQuery({
    queryKey: queryKeys.invoices.list({ projectId: form.projectId || undefined }),
    queryFn: () => invoicesApi.list({ projectId: form.projectId || undefined }),
    enabled: form.projectId.length > 0,
  });

  const purchaseOrdersQuery = useQuery({
    queryKey: queryKeys.purchaseOrders.list({
      projectId: form.projectId || undefined,
    }),
    queryFn: () =>
      purchaseOrdersApi.list({ projectId: form.projectId || undefined }),
    enabled: form.projectId.length > 0,
  });

  const receiptsQuery = useQuery({
    queryKey: queryKeys.receipts.list({ projectId: form.projectId || undefined }),
    queryFn: () => receiptsApi.list({ projectId: form.projectId || undefined }),
    enabled: form.projectId.length > 0,
  });

  const invoiceOptions = invoicesQuery.data?.data ?? [];
  const purchaseOrderOptions = purchaseOrdersQuery.data ?? [];
  const receiptOptions = receiptsQuery.data ?? [];

  useEffect(() => {
    if (!form.projectId || form.invoiceId || invoiceOptions.length === 0) {
      return;
    }

    setForm((current) => ({
      ...current,
      invoiceId: invoiceOptions[0]?.id ?? "",
    }));
  }, [form.projectId, form.invoiceId, invoiceOptions]);

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
        projectId: form.projectId,
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
          <Button size="sm" onClick={openCreateMatchRunDrawer}>
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
              onClick: openCreateMatchRunDrawer,
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
            <Select
              value={form.projectId || undefined}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  projectId: value,
                  invoiceId: "",
                  purchaseOrderId: "",
                  receiptId: "",
                }))
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue
                  placeholder={
                    projectsQuery.isLoading
                      ? "Loading projects..."
                      : "Select project"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {form.projectId &&
                  !projectOptions.some((project) => project.id === form.projectId) && (
                    <SelectItem value={form.projectId}>
                      Current: {form.projectId}
                    </SelectItem>
                  )}
                {projectOptions.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Invoice ID *</Label>
            <Select
              value={form.invoiceId || undefined}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  invoiceId: value,
                }))
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue
                  placeholder={
                    invoicesQuery.isLoading
                      ? "Loading invoices..."
                      : "Select invoice"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {form.invoiceId &&
                  !invoiceOptions.some((invoice) => invoice.id === form.invoiceId) && (
                    <SelectItem value={form.invoiceId}>
                      Current: {form.invoiceId}
                    </SelectItem>
                  )}
                {invoiceOptions.map((invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} - {invoice.vendorName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!invoicesQuery.isLoading && form.projectId && invoiceOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No invoices found for the selected project.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>PO ID</Label>
            <Select
              value={form.purchaseOrderId || NO_PO_VALUE}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  purchaseOrderId: value === NO_PO_VALUE ? "" : value,
                }))
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue
                  placeholder={
                    purchaseOrdersQuery.isLoading
                      ? "Loading purchase orders..."
                      : "Select PO"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PO_VALUE}>No PO</SelectItem>
                {form.purchaseOrderId &&
                  !purchaseOrderOptions.some(
                    (purchaseOrder) => purchaseOrder.id === form.purchaseOrderId,
                  ) && (
                    <SelectItem value={form.purchaseOrderId}>
                      Current: {form.purchaseOrderId}
                    </SelectItem>
                  )}
                {purchaseOrderOptions.map((purchaseOrder) => (
                  <SelectItem key={purchaseOrder.id} value={purchaseOrder.id}>
                    {purchaseOrder.poNumber} - {purchaseOrder.vendorName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Receipt ID</Label>
            <Select
              value={form.receiptId || NO_RECEIPT_VALUE}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  receiptId: value === NO_RECEIPT_VALUE ? "" : value,
                }))
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue
                  placeholder={
                    receiptsQuery.isLoading
                      ? "Loading receipts..."
                      : "Select receipt"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_RECEIPT_VALUE}>No receipt</SelectItem>
                {form.receiptId &&
                  !receiptOptions.some((receipt) => receipt.id === form.receiptId) && (
                    <SelectItem value={form.receiptId}>
                      Current: {form.receiptId}
                    </SelectItem>
                  )}
                {receiptOptions.map((receipt) => (
                  <SelectItem key={receipt.id} value={receipt.id}>
                    {receipt.receiptNumber} - {formatCents(receipt.receivedAmountCents)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
