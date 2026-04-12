"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-radix";
import {
  type AuditLogItem,
  auditLogApi,
} from "@/lib/api/modules/notifications-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { useMemo, useState } from "react";

const ACTION_OPTIONS = [
  "create",
  "update",
  "delete",
  "approve",
  "reject",
  "invite",
  "archive",
  "login",
] as const;

const ACTION_VARIANTS: Record<string, "default" | "secondary" | "success" | "warning" | "outline"> = {
  create: "success",
  update: "secondary",
  delete: "warning",
  approve: "success",
  reject: "warning",
  invite: "default",
  archive: "outline",
  login: "default",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getChangeSummary(
  beforeData: Record<string, unknown> | null,
  afterData: Record<string, unknown> | null,
) {
  if (!beforeData && !afterData) {
    return { count: 0, keys: [] as string[] };
  }

  const before = beforeData ?? {};
  const after = afterData ?? {};
  const keys = Array.from(
    new Set([...Object.keys(before), ...Object.keys(after)]),
  );

  const changedKeys = keys.filter((key) => {
    return JSON.stringify(before[key]) !== JSON.stringify(after[key]);
  });

  return { count: changedKeys.length, keys: changedKeys };
}

export function AuditLogPage() {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [entityType, setEntityType] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const params = useMemo(
    () => ({
      cursor,
      limit: 25,
      entityType: entityType || undefined,
      action: actionFilter === "all" ? undefined : actionFilter,
    }),
    [actionFilter, cursor, entityType],
  );

  const query = useQuery({
    queryKey: queryKeys.auditLog.list(params),
    queryFn: () => auditLogApi.list(params),
  });

  const rows = query.data?.data ?? [];

  const columns: DataTableColumn<AuditLogItem>[] = [
    {
      key: "createdAt",
      header: "Time",
      width: "180px",
      render: (row) => (
        <span className="text-muted-foreground">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: "entityType",
      header: "Entity type",
      width: "130px",
      render: (row) => (
        <span className="font-medium capitalize text-foreground">
          {row.entityType}
        </span>
      ),
    },
    {
      key: "entityId",
      header: "Entity id",
      width: "200px",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.entityId}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      width: "120px",
      render: (row) => (
        <Badge variant={ACTION_VARIANTS[row.action] ?? "outline"}>
          <span className="capitalize">{row.action}</span>
        </Badge>
      ),
    },
    {
      key: "actor",
      header: "Actor id",
      width: "170px",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.actorUserId}
        </span>
      ),
    },
    {
      key: "changes",
      header: "Changes",
      width: "220px",
      render: (row) => {
        const summary = getChangeSummary(row.beforeData, row.afterData);

        if (summary.count === 0) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }

        return (
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">
              {summary.count} field{summary.count === 1 ? "" : "s"} changed
            </p>
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {summary.keys.slice(0, 4).join(", ")}
              {summary.keys.length > 4 ? ` +${summary.keys.length - 4}` : ""}
            </p>
          </div>
        );
      },
    },
    {
      key: "metadata",
      header: "Metadata",
      width: "180px",
      render: (row) => {
        const metadata = row.metadata;

        if (!metadata) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }

        return (
          <details>
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
              Show JSON
            </summary>
            <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted/50 p-2 text-[11px] text-foreground">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </details>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Review immutable audit events with cursor pagination."
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-56">
          <Input
            placeholder="Entity type"
            value={entityType}
            onChange={(event) => {
              setCursor(undefined);
              setEntityType(event.target.value);
            }}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={actionFilter}
            onValueChange={(value) => {
              setCursor(undefined);
              setActionFilter(value);
            }}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {ACTION_OPTIONS.map((option) => (
                <SelectItem
                  key={option}
                  value={option}
                  className="capitalize"
                >
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          className="h-8 px-2 text-xs"
          variant="outline"
          onClick={() => {
            setCursor(undefined);
            setEntityType("");
            setActionFilter("all");
          }}
        >
          Reset
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        rowKey={(row) => row.id}
        emptyState={
          <EmptyState
            icon={History}
            title="No audit logs"
            description="No events match the selected filters."
          />
        }
      />

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() =>
            setCursor(query.data?.pagination.nextCursor ?? undefined)
          }
          disabled={!query.data?.pagination.hasMore || query.isFetching}
        >
          Load more
        </Button>
      </div>
    </div>
  );
}
