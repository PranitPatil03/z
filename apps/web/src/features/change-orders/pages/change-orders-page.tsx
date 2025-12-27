"use client";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  canSubmitForApproval,
  getSlaIndicator,
} from "@/features/change-orders/lib/change-order-utils";
import {
  type ChangeOrder,
  type ChangeOrderStatus,
  changeOrdersApi,
} from "@/lib/api/modules/change-orders-api";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Loader2, Plus, Workflow } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const STATUS_ORDER: ChangeOrderStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "revision_requested",
  "closed",
];

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
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

export function ChangeOrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [statusFilter, setStatusFilter] = useState<ChangeOrderStatus | "">("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    projectId: "",
    title: "",
    reason: "",
    impactCost: "0",
    impactDays: "0",
    deadlineAt: "",
    approvalStages: "",
  });

  const normalizedProjectId = projectId.trim();

  const listQuery = useQuery({
    queryKey: queryKeys.changeOrders.list({ projectId: normalizedProjectId }),
    queryFn: () => changeOrdersApi.list({ projectId: normalizedProjectId }),
    enabled: normalizedProjectId.length > 0,
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => changeOrdersApi.submit(id),
    onSuccess: () => {
      toast.success("Change order submitted");
      void listQuery.refetch();
      void queryClient.invalidateQueries({
        queryKey: queryKeys.changeOrders.all,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const impactCostCents = Math.round(
        Number.parseFloat(form.impactCost) * 100,
      );
      const impactDays = Number.parseInt(form.impactDays, 10);

      const stageList = form.approvalStages
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      return changeOrdersApi.create({
        projectId: form.projectId.trim(),
        title: form.title.trim(),
        reason: form.reason.trim(),
        impactCostCents: Number.isFinite(impactCostCents) ? impactCostCents : 0,
        impactDays: Number.isFinite(impactDays) ? impactDays : 0,
        deadlineAt: form.deadlineAt
          ? new Date(form.deadlineAt).toISOString()
          : undefined,
        routingPolicy:
          stageList.length > 0
            ? {
                approvalStages: stageList,
              }
            : undefined,
      });
    },
    onSuccess: () => {
      toast.success("Change order created");
      setFormError(null);
      setDrawerOpen(false);
      setProjectId(form.projectId.trim());
      setForm({
        projectId: form.projectId.trim(),
        title: "",
        reason: "",
        impactCost: "0",
        impactDays: "0",
        deadlineAt: "",
        approvalStages: "",
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.changeOrders.all,
      });
    },
    onError: (error: Error) => {
      setFormError(error.message);
      toast.error(error.message);
    },
  });

  const rows = useMemo(() => {
    const data = listQuery.data ?? [];
    if (!statusFilter) {
      return data;
    }
    return data.filter((item) => item.status === statusFilter);
  }, [listQuery.data, statusFilter]);

  const columns: DataTableColumn<ChangeOrder>[] = [
    {
      key: "title",
      header: "Change order",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {row.reason}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "190px",
      render: (row) => (
        <div className="space-y-1">
          <StatusBadge status={row.status} />
          <p className="text-xs text-muted-foreground">{row.pipelineStage}</p>
        </div>
      ),
    },
    {
      key: "impact",
      header: "Impact",
      width: "180px",
      render: (row) => (
        <div>
          <p className="text-sm text-foreground">
            {formatCents(row.impactCostCents)}
          </p>
          <p className="text-xs text-muted-foreground">{row.impactDays} days</p>
        </div>
      ),
    },
    {
      key: "deadline",
      header: "SLA",
      width: "220px",
      render: (row) => {
        const sla = getSlaIndicator(row.deadlineAt);
        return (
          <div>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(row.deadlineAt)}
            </p>
            <div
              className={cn(
                "mt-1 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                sla.state === "overdue" &&
                  "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
                sla.state === "warning" &&
                  "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
                sla.state === "ok" &&
                  "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
                sla.state === "none" &&
                  "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400",
              )}
            >
              <Clock3 className="mr-1 h-3 w-3" />
              {sla.label}
            </div>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      width: "120px",
      render: (row) => (
        <div className="flex justify-end">
          {canSubmitForApproval(row.status) && (
            <Button
              size="sm"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                submitMutation.mutate(row.id);
              }}
              disabled={submitMutation.isPending}
            >
              Submit
            </Button>
          )}
        </div>
      ),
    },
  ];

  const canCreate =
    form.projectId.trim().length > 0 &&
    form.title.trim().length >= 2 &&
    form.reason.trim().length >= 2;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Change Orders"
        description="Manage scope-change lifecycle, approvals, and SLA deadlines."
        action={
          <Button
            size="sm"
            onClick={() => {
              setDrawerOpen(true);
              setForm((current) => ({
                ...current,
                projectId: normalizedProjectId || current.projectId,
              }));
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New change order
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Input
          placeholder="Project ID (required)"
          value={projectId}
          onChange={(event) => {
            setProjectId(event.target.value);
          }}
        />
        <Select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as ChangeOrderStatus | "")
          }
          placeholder="All statuses"
        >
          {STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              void listQuery.refetch();
            }}
            disabled={listQuery.isFetching || normalizedProjectId.length === 0}
          >
            Refresh
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setStatusFilter("");
            }}
            disabled={statusFilter.length === 0}
          >
            Clear status
          </Button>
        </div>
      </div>

      {normalizedProjectId.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="Project scope required"
          description="Enter a project ID to load change orders from backend."
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={listQuery.isLoading}
          rowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/change-orders/${row.id}`)}
          emptyState={
            <EmptyState
              icon={Workflow}
              title="No change orders"
              description="Create a draft change order for this project."
              action={{
                label: "New change order",
                onClick: () => setDrawerOpen(true),
              }}
            />
          }
        />
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setFormError(null);
        }}
        title="Create change order"
        description="Draft a change order and optional approval routing policy."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !canCreate}
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create draft
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
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Electrical code update"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Reason *</Label>
            <Input
              value={form.reason}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
              placeholder="Scope increase due to inspection findings"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Impact cost (USD)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.impactCost}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    impactCost: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Impact days</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.impactDays}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    impactDays: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Deadline</Label>
            <Input
              type="datetime-local"
              value={form.deadlineAt}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  deadlineAt: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Approval stages (comma separated)</Label>
            <Input
              value={form.approvalStages}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  approvalStages: event.target.value,
                }))
              }
              placeholder="pm_review, finance_review"
            />
          </div>
          {formError && <p className="text-xs text-destructive">{formError}</p>}
        </div>
      </FormDrawer>
    </div>
  );
}
