"use client";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { buildActivityFilters } from "@/features/ops-intelligence/lib/ops-intelligence-utils";
import {
  type ActivityFeedItem,
  activityFeedApi,
} from "@/lib/api/modules/notifications-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useQuery } from "@tanstack/react-query";
import { Activity, Clock3, FolderTree, X } from "lucide-react";
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

export function ActivityFeedPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [entityType, setEntityType] = useState("");
  const [projectId, setProjectId] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedEntityType, setSelectedEntityType] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelinePageSize] = useState(10);

  const filters = useMemo(
    () =>
      buildActivityFilters({
        page,
        pageSize,
        entityType,
        projectId,
        action,
        from,
        to,
      }),
    [action, entityType, from, page, pageSize, projectId, to],
  );

  const query = useQuery({
    queryKey: queryKeys.activityFeed.list(filters),
    queryFn: () => activityFeedApi.list(filters),
  });

  const timelineFilters = useMemo(
    () =>
      buildActivityFilters({
        page: timelinePage,
        pageSize: timelinePageSize,
        action,
        from,
        to,
      }),
    [action, from, timelinePage, timelinePageSize, to],
  );

  const timelineQuery = useQuery({
    queryKey: queryKeys.activityFeed.timeline(
      selectedEntityType,
      selectedEntityId,
      timelineFilters,
    ),
    queryFn: () =>
      activityFeedApi.timeline(
        selectedEntityType,
        selectedEntityId,
        timelineFilters,
      ),
    enabled: Boolean(selectedEntityType && selectedEntityId),
  });

  const data = query.data?.items ?? [];
  const pagination = query.data?.pagination;
  const timelineRows = timelineQuery.data?.items ?? [];
  const timelinePagination = timelineQuery.data?.pagination;

  const columns: DataTableColumn<ActivityFeedItem>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      width: "200px",
      render: (row) => (
        <span className="text-muted-foreground">
          {formatDateTime(row.timestamp)}
        </span>
      ),
    },
    {
      key: "entity",
      header: "Entity",
      width: "180px",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground capitalize">{row.entity}</p>
          <p className="text-xs text-muted-foreground">{row.entityId}</p>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      width: "120px",
      render: (row) => <span className="capitalize">{row.type}</span>,
    },
    {
      key: "actor",
      header: "Actor",
      width: "170px",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.actor}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (row) => <span>{row.description}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Feed"
        description="Track system actions with filters and pagination."
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-52">
          <Input
            placeholder="Entity type"
            value={entityType}
            onChange={(event) => {
              setPage(1);
              setEntityType(event.target.value);
            }}
          />
        </div>
        <div className="w-full sm:w-52">
          <Input
            placeholder="Project ID"
            value={projectId}
            onChange={(event) => {
              setPage(1);
              setProjectId(event.target.value);
            }}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            value={action}
            onChange={(event) => {
              setPage(1);
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
        </div>
        <div className="w-full sm:w-40">
          <Input
            type="date"
            value={from}
            onChange={(event) => {
              setPage(1);
              setFrom(event.target.value);
            }}
          />
        </div>
        <div className="w-full sm:w-40">
          <Input
            type="date"
            value={to}
            onChange={(event) => {
              setPage(1);
              setTo(event.target.value);
            }}
          />
        </div>
        <Button
          size="sm"
          className="h-8 px-2 text-xs"
          variant="outline"
          onClick={() => {
            setPage(1);
            setEntityType("");
            setProjectId("");
            setAction("");
            setFrom("");
            setTo("");
          }}
        >
          Reset
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={query.isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => {
          setSelectedEntityType(row.entity);
          setSelectedEntityId(row.entityId);
          setTimelinePage(1);
        }}
        emptyState={
          <EmptyState
            icon={Activity}
            title="No activity found"
            description="Adjust filters or wait for new events."
          />
        }
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {pagination?.page ?? page} of {pagination?.totalPages ?? 1}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            disabled={(pagination?.page ?? page) <= 1 || query.isFetching}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => current + 1)}
            disabled={
              query.isFetching ||
              !pagination ||
              (pagination.page >= pagination.totalPages &&
                pagination.totalPages > 0)
            }
          >
            Next
          </Button>
        </div>
      </div>

      {selectedEntityType && selectedEntityId && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Entity timeline
              </h2>
              <p className="text-xs text-muted-foreground">
                {selectedEntityType} / {selectedEntityId}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setSelectedEntityType("");
                setSelectedEntityId("");
                setTimelinePage(1);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {timelineQuery.isLoading ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Loading timeline...
              </p>
            </div>
          ) : timelineRows.length === 0 ? (
            <EmptyState
              icon={FolderTree}
              title="No timeline events"
              description="No timeline entries match current filters."
              className="rounded-none border-0"
            />
          ) : (
            <div className="space-y-2">
              {timelineRows.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground capitalize">
                      {item.type}
                    </span>
                    <span className="text-muted-foreground">
                      by {item.actor}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="h-3 w-3" />
                    {formatDateTime(item.timestamp)}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Timeline page {timelinePagination?.page ?? timelinePage} of{" "}
              {timelinePagination?.totalPages ?? 1}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setTimelinePage((current) => Math.max(current - 1, 1))
                }
                disabled={
                  (timelinePagination?.page ?? timelinePage) <= 1 ||
                  timelineQuery.isFetching
                }
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimelinePage((current) => current + 1)}
                disabled={
                  timelineQuery.isFetching ||
                  !timelinePagination ||
                  timelinePagination.page >= timelinePagination.totalPages
                }
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
