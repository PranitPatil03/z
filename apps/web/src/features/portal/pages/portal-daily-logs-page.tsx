"use client";

import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  type PortalDailyLog,
  type PortalDailyLogReviewStatus,
  portalApi,
} from "@/lib/api/modules/portal-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  formatPortalDate,
  formatPortalDateTime,
  parseCommaSeparated,
  toIsoOrUndefined,
} from "../lib/portal-utils";

const REVIEW_STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "rejected", label: "Rejected" },
];

export function PortalDailyLogsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reviewStatus, setReviewStatus] = useState("");
  const [limit, setLimit] = useState("50");
  const [form, setForm] = useState({
    logDate: "",
    laborCount: "",
    equipmentUsed: "",
    attachments: "",
    performedWork: "",
  });

  const listParams = useMemo(
    () => ({
      reviewStatus: (reviewStatus || undefined) as
        | PortalDailyLogReviewStatus
        | undefined,
      limit: Number.parseInt(limit, 10) || 50,
    }),
    [limit, reviewStatus],
  );

  const dailyLogsQuery = useQuery({
    queryKey: queryKeys.portal.dailyLogs.list(listParams),
    queryFn: () => portalApi.listDailyLogs(listParams),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const logDate = toIsoOrUndefined(form.logDate);
      if (!logDate) {
        throw new Error("Log date is required");
      }

      const laborCount = Number.parseInt(form.laborCount, 10);
      if (!Number.isFinite(laborCount) || laborCount < 0) {
        throw new Error("Labor count must be a non-negative integer");
      }

      if (form.performedWork.trim().length < 3) {
        throw new Error("Performed work must be at least 3 characters");
      }

      return portalApi.createDailyLog({
        logDate,
        laborCount,
        equipmentUsed: parseCommaSeparated(form.equipmentUsed),
        attachments: parseCommaSeparated(form.attachments),
        performedWork: form.performedWork.trim(),
      });
    },
    onSuccess: (result) => {
      toast.success("Daily log submitted");
      setForm({
        logDate: "",
        laborCount: "",
        equipmentUsed: "",
        attachments: "",
        performedWork: "",
      });

      void queryClient.invalidateQueries({
        queryKey: queryKeys.portal.dailyLogs.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.portal.overview(),
      });
      router.push(`/portal/daily-logs/${result.data.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Unable to submit daily log");
    },
  });

  const columns: DataTableColumn<PortalDailyLog>[] = [
    {
      key: "id",
      header: "Daily log",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.id}</p>
          <p className="text-xs text-muted-foreground">
            {formatPortalDate(row.logDate)}
          </p>
        </div>
      ),
    },
    {
      key: "reviewStatus",
      header: "Review status",
      render: (row) => <StatusBadge status={row.reviewStatus} />,
    },
    {
      key: "laborCount",
      header: "Labor",
      render: (row) => row.laborCount,
    },
    {
      key: "submittedAt",
      header: "Submitted",
      render: (row) => formatPortalDateTime(row.submittedAt),
    },
  ];

  if (dailyLogsQuery.isLoading) {
    return <LoadingState title="Loading daily logs" rows={4} />;
  }

  if (dailyLogsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load daily logs"
        description="Please refresh your session and try again."
        onRetry={() => {
          void dailyLogsQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Logs"
        description="Submit daily field activity updates for review."
      />

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">
          Create daily log
        </h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="portal-daily-log-date">Log date</Label>
            <Input
              id="portal-daily-log-date"
              type="datetime-local"
              value={form.logDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  logDate: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portal-daily-labor-count">Labor count</Label>
            <Input
              id="portal-daily-labor-count"
              value={form.laborCount}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  laborCount: event.target.value,
                }))
              }
              inputMode="numeric"
              placeholder="0"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portal-daily-equipment">Equipment used</Label>
            <Input
              id="portal-daily-equipment"
              value={form.equipmentUsed}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  equipmentUsed: event.target.value,
                }))
              }
              placeholder="Excavator, Lift, Generator"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portal-daily-attachments">Attachments</Label>
            <Input
              id="portal-daily-attachments"
              value={form.attachments}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  attachments: event.target.value,
                }))
              }
              placeholder="URL1, URL2"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="portal-daily-work">Performed work</Label>
            <textarea
              id="portal-daily-work"
              rows={4}
              value={form.performedWork}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  performedWork: event.target.value,
                }))
              }
              className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Describe the work completed during this shift"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            Submit daily log
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            value={reviewStatus}
            onChange={(event) => setReviewStatus(event.target.value)}
          >
            {REVIEW_STATUS_FILTERS.map((status) => (
              <option key={status.value || "all"} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
          <Input
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            inputMode="numeric"
            placeholder="Result limit"
          />
        </div>

        <DataTable
          columns={columns}
          data={dailyLogsQuery.data?.data ?? []}
          rowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/portal/daily-logs/${row.id}`)}
          emptyState={
            <EmptyState
              icon={ClipboardList}
              title="No daily logs"
              description="Create your first daily log to capture field activity."
              className="border-none"
            />
          }
        />
      </section>
    </div>
  );
}
