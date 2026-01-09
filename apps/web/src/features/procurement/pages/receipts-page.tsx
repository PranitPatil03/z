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
import { projectsApi } from "@/lib/api/modules/projects-api";
import { type Receipt, receiptsApi } from "@/lib/api/modules/receipts-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ReceiptsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    projectId: "",
    purchaseOrderId: "",
    receiptNumber: "",
    receivedAmount: "",
    receivedAt: "",
    notes: "",
  });

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => projectsApi.list(),
  });

  const projectOptions = projectsQuery.data ?? [];

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

  const query = useQuery({
    queryKey: queryKeys.receipts.list(),
    queryFn: () => receiptsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      receiptsApi.create({
        projectId: form.projectId,
        purchaseOrderId: form.purchaseOrderId || undefined,
        receiptNumber: form.receiptNumber,
        receivedAmountCents: Math.round(
          Number.parseFloat(form.receivedAmount) * 100,
        ),
        receivedAt: form.receivedAt
          ? new Date(form.receivedAt).toISOString()
          : undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      toast.success("Receipt created");
      setDrawerOpen(false);
      setForm({
        projectId: form.projectId,
        purchaseOrderId: "",
        receiptNumber: "",
        receivedAmount: "",
        receivedAt: "",
        notes: "",
      });
      qc.invalidateQueries({ queryKey: queryKeys.receipts.all });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const columns: DataTableColumn<Receipt>[] = [
    {
      key: "receipt",
      header: "Receipt",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.receiptNumber}</p>
          <p className="text-xs text-muted-foreground">
            PO: {row.purchaseOrderId || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "130px",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "amount",
      header: "Amount",
      width: "130px",
      render: (row) => <span>{formatCents(row.receivedAmountCents)}</span>,
    },
    {
      key: "receivedAt",
      header: "Received",
      width: "130px",
      render: (row) => (
        <span className="text-muted-foreground">
          {formatDate(row.receivedAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipts"
        description="Track goods/service receipt confirmations against purchase orders."
        action={
          <Button
            size="sm"
            onClick={() => {
              setDrawerOpen(true);
              setForm((current) => ({
                ...current,
                projectId: current.projectId || projectOptions[0]?.id || "",
              }));
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New receipt
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={query.data ?? []}
        isLoading={query.isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/receipts/${row.id}`)}
        emptyState={
          <EmptyState
            icon={ClipboardCheck}
            title="No receipts"
            description="Create a receipt to reconcile delivered work or materials."
            action={{
              label: "New receipt",
              onClick: () => setDrawerOpen(true),
            }}
          />
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Create receipt"
        description="Log a receipt against a PO and project."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                createMutation.isPending ||
                !form.projectId ||
                !form.receiptNumber ||
                !form.receivedAmount
              }
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create receipt
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
            <Label>Receipt number *</Label>
            <Input
              value={form.receiptNumber}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  receiptNumber: event.target.value,
                }))
              }
              placeholder="RCPT-2026-001"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Received amount (USD) *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.receivedAmount}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  receivedAmount: event.target.value,
                }))
              }
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Received at</Label>
            <Input
              type="date"
              value={form.receivedAt}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  receivedAt: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Delivery note"
            />
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}
