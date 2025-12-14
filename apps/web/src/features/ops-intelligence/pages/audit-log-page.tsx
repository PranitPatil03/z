"use client";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AuditLogPage() {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");

  const params = useMemo(
    () => ({
      cursor,
      limit: 25,
      entityType: entityType || undefined,
      action: action || undefined,
    }),
    [action, cursor, entityType],
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
      width: "190px",
      render: (row) => (
        <span className="text-muted-foreground">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: "entity",
      header: "Entity",
      width: "180px",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground capitalize">
            {row.entityType}
          </p>
          <p className="text-xs text-muted-foreground">{row.entityId}</p>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      width: "120px",
      render: (row) => <span className="capitalize">{row.action}</span>,
    },
    {
      key: "actor",
      header: "Actor",
      width: "180px",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.actorUserId}
        </span>
      ),
    },
    {
      key: "metadata",
      header: "Metadata",
      render: (row) => (
        <span className="line-clamp-1 text-xs text-muted-foreground">
          {JSON.stringify(row.metadata ?? {})}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Review immutable audit events with cursor pagination."
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Input
          placeholder="Entity type"
          value={entityType}
          onChange={(event) => {
            setCursor(undefined);
            setEntityType(event.target.value);
          }}
        />
        <Select
          value={action}
          onChange={(event) => {
            setCursor(undefined);
            setAction(event.target.value);
          }}
          placeholder="All actions"
        >
          {ACTION_OPTIONS.map((option) => (
            <option key={option} value={option} className="capitalize">
              {option}
            </option>
          ))}
        </Select>
        <Button
          variant="outline"
          onClick={() => {
            setCursor(undefined);
            setEntityType("");
            setAction("");
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
