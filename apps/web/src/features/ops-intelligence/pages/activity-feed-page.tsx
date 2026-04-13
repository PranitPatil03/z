"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-radix";
import { buildActivityFilters } from "@/features/ops-intelligence/lib/ops-intelligence-utils";
import {
  type ActivityFeedItem,
  activityFeedApi,
} from "@/lib/api/modules/notifications-api";
import { projectsApi } from "@/lib/api/modules/projects-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useQuery } from "@tanstack/react-query";
import { Activity, CalendarDays, FolderTree, X } from "lucide-react";
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

const ALL_PROJECTS_VALUE = "__all_projects__";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function toValidDate(value: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

function normalizeDateForFilter(date: Date, boundary: "start" | "end") {
  const hours = boundary === "start" ? 0 : 23;
  const minutes = boundary === "start" ? 0 : 59;
  const seconds = boundary === "start" ? 0 : 59;
  const milliseconds = boundary === "start" ? 0 : 999;

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    seconds,
    milliseconds,
  ).toISOString();
}

function formatDateLabel(value: string, placeholder: string) {
  const parsed = toValidDate(value);
  if (!parsed) {
    return placeholder;
  }
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ActivityFeedPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [entityType, setEntityType] = useState("");
  const [projectId, setProjectId] = useState(ALL_PROJECTS_VALUE);
  const [action, setAction] = useState<"all" | (typeof ACTION_OPTIONS)[number]>(
    "all",
  );
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedEntityType, setSelectedEntityType] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelinePageSize] = useState(10);

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => projectsApi.list(),
  });

  const projectOptions = projectsQuery.data ?? [];
  const selectedProjectId =
    projectId === ALL_PROJECTS_VALUE ? "" : projectId;

  const filters = useMemo(
    () =>
      buildActivityFilters({
        page,
        pageSize,
        entityType,
        projectId: selectedProjectId,
        action: action === "all" ? "" : action,
        from,
        to,
      }),
    [action, entityType, from, page, pageSize, selectedProjectId, to],
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
        action: action === "all" ? "" : action,
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
  const selectedFromDate = toValidDate(from);
  const selectedToDate = toValidDate(to);

  const columns: DataTableColumn<ActivityFeedItem>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      width: "210px",
      render: (row) => (
        <span className="text-muted-foreground">
          {formatDateTime(row.timestamp)}
        </span>
      ),
    },
    {
      key: "entity",
      header: "Entity",
      width: "230px",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground capitalize">{row.entity}</p>
          <p className="text-xs text-muted-foreground truncate">{row.entityId}</p>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      width: "120px",
      render: (row) => (
        <Badge variant="outline" className="capitalize">
          {row.type}
        </Badge>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      width: "230px",
      render: (row) => (
        <span className="block truncate font-mono text-xs text-muted-foreground">
          {row.actor}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (row) => (
        <span className="block min-w-0 max-w-full whitespace-normal break-words text-foreground line-clamp-2">
          {row.description}
        </span>
      ),
    },
  ];

  const timelineColumns: DataTableColumn<ActivityFeedItem>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      width: "190px",
      render: (row) => (
        <span className="text-muted-foreground">{formatDateTime(row.timestamp)}</span>
      ),
    },
    {
      key: "action",
      header: "Action",
      width: "120px",
      render: (row) => (
        <Badge variant="outline" className="capitalize">
          {row.type}
        </Badge>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      width: "230px",
      render: (row) => (
        <span className="block truncate font-mono text-xs text-muted-foreground">{row.actor}</span>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (row) => (
        <span className="block min-w-0 max-w-full whitespace-normal break-words text-foreground line-clamp-2">
          {row.description}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Feed"
        description="Track system actions with filters and pagination."
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_minmax(220px,1.2fr)_minmax(170px,0.9fr)_minmax(170px,0.9fr)_minmax(170px,0.9fr)_auto]">
          <div>
            <Input
              placeholder="Entity type"
              value={entityType}
              onChange={(event) => {
                setPage(1);
                setEntityType(event.target.value);
              }}
            />
          </div>
          <div>
            <Select
              value={projectId}
              onValueChange={(value) => {
                setTimelinePage(1);
                setPage(1);
                setProjectId(value);
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PROJECTS_VALUE}>All projects</SelectItem>
                {projectOptions.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={action}
              onValueChange={(value) => {
                setTimelinePage(1);
                setPage(1);
                setAction(value as "all" | (typeof ACTION_OPTIONS)[number]);
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {ACTION_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option} className="capitalize">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={`h-10 w-full justify-start text-left font-normal ${
                    selectedFromDate ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {formatDateLabel(from, "From date")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedFromDate}
                  onSelect={(date) => {
                    setTimelinePage(1);
                    setPage(1);
                    if (!date) {
                      setFrom("");
                      return;
                    }
                    setFrom(normalizeDateForFilter(date, "start"));
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={`h-10 w-full justify-start text-left font-normal ${
                    selectedToDate ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {formatDateLabel(to, "To date")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedToDate}
                  onSelect={(date) => {
                    setTimelinePage(1);
                    setPage(1);
                    if (!date) {
                      setTo("");
                      return;
                    }
                    setTo(normalizeDateForFilter(date, "end"));
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-end xl:justify-end">
            <Button
              className="h-10 w-full xl:w-auto"
              variant="outline"
              onClick={() => {
                setTimelinePage(1);
                setPage(1);
                setEntityType("");
                setProjectId(ALL_PROJECTS_VALUE);
                setAction("all");
                setFrom("");
                setTo("");
              }}
            >
              Reset filters
            </Button>
          </div>
      </div>

      <DataTable
        className="w-full [&_table]:w-full [&_table]:table-fixed"
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
            <DataTable
              className="w-full [&_table]:w-full [&_table]:table-fixed"
              columns={timelineColumns}
              data={timelineRows}
              isLoading={timelineQuery.isLoading}
              rowKey={(row) => row.id}
              emptyState={
                <EmptyState
                  icon={FolderTree}
                  title="No timeline events"
                  description="No timeline entries match current filters."
                  className="rounded-none border-0"
                />
              }
            />
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
