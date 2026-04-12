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
import { type Rfq, type RfqStatus, rfqsApi } from "@/lib/api/modules/rfqs-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSearch, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const RFQ_STATUS_OPTIONS: RfqStatus[] = ["draft", "sent", "closed", "canceled"];

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RfqsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<RfqStatus | "">("");
  const [form, setForm] = useState({
    projectId: "",
    title: "",
    scope: "",
    dueDate: "",
  });

  const query = useQuery({
    queryKey: queryKeys.rfqs.list(),
    queryFn: () => rfqsApi.list(),
  });

  const rows = useMemo(() => {
    const list = query.data ?? [];
    if (!statusFilter) {
      return list;
    }

    return list.filter((item) => item.status === statusFilter);
  }, [query.data, statusFilter]);

  const createMutation = useMutation({
    mutationFn: () =>
      rfqsApi.create({
        projectId: form.projectId,
        title: form.title,
        scope: form.scope,
        dueDate: form.dueDate
          ? new Date(form.dueDate).toISOString()
          : undefined,
      }),
    onSuccess: () => {
      toast.success("RFQ created");
      setDrawerOpen(false);
      setForm({ projectId: "", title: "", scope: "", dueDate: "" });
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const columns: DataTableColumn<Rfq>[] = [
    {
      key: "title",
      header: "RFQ",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.title}</p>
          <p className="text-xs text-muted-foreground">
            Project: {row.projectId}
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
      key: "dueDate",
      header: "Due",
      width: "130px",
      render: (row) => (
        <span className="text-muted-foreground">{formatDate(row.dueDate)}</span>
      ),
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
        title="RFQs"
        description="Manage request-for-quote documents and lifecycle status."
        action={
          <Button size="sm" onClick={() => setDrawerOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New RFQ
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as RfqStatus | "")
          }
          className="w-44"
          placeholder="All statuses"
        >
          {RFQ_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status} className="capitalize">
              {status}
            </option>
          ))}
        </Select>
        {statusFilter && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter("")}>
            Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/rfqs/${row.id}`)}
        emptyState={
          <EmptyState
            icon={FileSearch}
            title="No RFQs"
            description="Create your first RFQ to begin sourcing."
            action={{ label: "New RFQ", onClick: () => setDrawerOpen(true) }}
          />
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Create RFQ"
        description="Create a request for quote for a project scope package."
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
                !form.title ||
                !form.scope
              }
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create RFQ
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
              placeholder="Electrical package"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Scope *</Label>
            <Input
              value={form.scope}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  scope: event.target.value,
                }))
              }
              placeholder="Scope summary"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Due date</Label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  dueDate: event.target.value,
                }))
              }
            />
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}
