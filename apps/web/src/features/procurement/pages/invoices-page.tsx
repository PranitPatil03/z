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
import {
  type Invoice,
  type InvoiceStatus,
  invoicesApi,
} from "@/lib/api/modules/invoices-api";
import { projectsApi } from "@/lib/api/modules/projects-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function formatCents(c: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(c / 100);
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_OPTIONS: InvoiceStatus[] = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "paid",
  "hold",
];

const ALL_STATUS_VALUE = "__all_status__";

function formatProjectCodeToken(projectCode?: string) {
  const sanitized = (projectCode ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);

  return sanitized || "GEN";
}

function createInvoiceNumber(projectCode?: string) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const serial = String(Math.floor(Math.random() * 9000) + 1000);

  return `INV-${formatProjectCodeToken(projectCode)}-${yy}${mm}${dd}-${serial}`;
}

export function InvoicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "">("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [invoiceNumberManuallyEdited, setInvoiceNumberManuallyEdited] =
    useState(false);
  const [form, setForm] = useState({
    projectId: "",
    invoiceNumber: "",
    vendorName: "",
    totalAmountCents: "",
    currency: "USD",
    dueDate: "",
  });

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => projectsApi.list(),
  });

  const projectOptions = projectsQuery.data ?? [];
  const requestedProjectId = (searchParams.get("projectId") ?? "").trim();

  function findProjectCode(projectId: string) {
    return projectOptions.find((project) => project.id === projectId)?.code;
  }

  function resolveDefaultProjectId(currentProjectId?: string) {
    return (
      currentProjectId ||
      requestedProjectId ||
      projectOptions[0]?.id ||
      ""
    );
  }

  function openNewInvoiceDrawer() {
    const defaultProjectId = resolveDefaultProjectId(form.projectId);
    const projectCode = findProjectCode(defaultProjectId);

    setInvoiceNumberManuallyEdited(false);
    setDrawerOpen(true);
    setForm((current) => ({
      ...current,
      projectId: defaultProjectId,
      invoiceNumber: createInvoiceNumber(projectCode),
    }));
  }

  useEffect(() => {
    if (form.projectId) {
      return;
    }

    const defaultProjectId = resolveDefaultProjectId();
    if (!defaultProjectId) {
      return;
    }

    const projectCode = findProjectCode(defaultProjectId);

    setForm((current) => ({
      ...current,
      projectId: defaultProjectId,
      invoiceNumber: current.invoiceNumber || createInvoiceNumber(projectCode),
    }));
  }, [form.projectId, projectOptions, requestedProjectId]);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.invoices.list({ status: statusFilter || undefined }),
    queryFn: () =>
      invoicesApi.list({
        status: (statusFilter as InvoiceStatus) || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      invoicesApi.create({
        projectId: form.projectId,
        invoiceNumber: form.invoiceNumber,
        vendorName: form.vendorName,
        totalAmountCents: Math.round(
          Number.parseFloat(form.totalAmountCents) * 100,
        ),
        currency: form.currency,
        dueDate: form.dueDate || undefined,
      }),
    onSuccess: () => {
      toast.success("Invoice created");
      qc.invalidateQueries({ queryKey: queryKeys.invoices.all });
      setDrawerOpen(false);
      setInvoiceNumberManuallyEdited(false);
      setForm((current) => ({
        ...current,
        invoiceNumber: createInvoiceNumber(findProjectCode(current.projectId)),
        vendorName: "",
        totalAmountCents: "",
        dueDate: "",
      }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: DataTableColumn<Invoice>[] = [
    {
      key: "number",
      header: "Invoice",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.invoiceNumber}</p>
          <p className="text-xs text-muted-foreground">{row.vendorName}</p>
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
      render: (row) => (
        <span className="font-medium">{formatCents(row.totalAmountCents)}</span>
      ),
    },
    {
      key: "due",
      header: "Due date",
      width: "130px",
      render: (row) => (
        <span className="text-muted-foreground">{formatDate(row.dueDate)}</span>
      ),
    },
    {
      key: "created",
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
        title="Invoices"
        description="Track and manage vendor invoices across all projects."
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={statusFilter || ALL_STATUS_VALUE}
              onValueChange={(value) =>
                setStatusFilter(
                  value === ALL_STATUS_VALUE ? "" : (value as InvoiceStatus),
                )
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUS_VALUE}>All statuses</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {statusFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10"
              onClick={() => setStatusFilter("")}
            >
              Clear
            </Button>
          )}
        </div>

        <Button size="sm" className="h-10" onClick={openNewInvoiceDrawer}>
          <Plus className="mr-1.5 h-4 w-4" />
          New invoice
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        rowKey={(r) => r.id}
        onRowClick={(row) => router.push(`/invoices/${row.id}`)}
        emptyState={
          <EmptyState
            icon={FileText}
            title="No invoices found"
            description="Create an invoice or adjust your filters."
            action={{
              label: "New invoice",
              onClick: openNewInvoiceDrawer,
            }}
          />
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="New invoice"
        description="Submit a vendor invoice for review."
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
                !form.invoiceNumber ||
                !form.vendorName ||
                !form.totalAmountCents
              }
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create invoice
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Project ID *</Label>
            <Select
              value={form.projectId || undefined}
              onValueChange={(value) => {
                const projectCode = findProjectCode(value);
                setForm((current) => ({
                  ...current,
                  projectId: value,
                  invoiceNumber: invoiceNumberManuallyEdited
                    ? current.invoiceNumber
                    : createInvoiceNumber(projectCode),
                }));
              }}
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
            <Label>Invoice number *</Label>
            <Input
              placeholder="INV-2024-001"
              value={form.invoiceNumber}
              onChange={(event) => {
                setInvoiceNumberManuallyEdited(true);
                setForm((current) => ({
                  ...current,
                  invoiceNumber: event.target.value,
                }));
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Vendor name *</Label>
            <Input
              placeholder="Acme Contractors LLC"
              value={form.vendorName}
              onChange={(e) =>
                setForm((f) => ({ ...f, vendorName: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Total amount (USD) *</Label>
            <Input
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={form.totalAmountCents}
              onChange={(e) =>
                setForm((f) => ({ ...f, totalAmountCents: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Due date</Label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, dueDate: e.target.value }))
              }
            />
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}
