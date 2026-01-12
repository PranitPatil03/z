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
import { type Rfq, type RfqStatus, rfqsApi } from "@/lib/api/modules/rfqs-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSearch, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const RFQ_STATUS_OPTIONS: RfqStatus[] = ["draft", "sent", "closed", "canceled"];
const ALL_STATUS_VALUE = "__all_status__";

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
      setForm((current) => ({
        ...current,
        title: "",
        scope: "",
        dueDate: "",
      }));
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
            New RFQ
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <Select
          value={statusFilter || ALL_STATUS_VALUE}
          onValueChange={(value) =>
            setStatusFilter(value === ALL_STATUS_VALUE ? "" : (value as RfqStatus))
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS_VALUE}>All statuses</SelectItem>
            {RFQ_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
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
