"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { summarizePortfolioProjects } from "@/features/ops-intelligence/lib/ops-intelligence-utils";
import {
  type ActivityFeedItem,
  activityFeedApi,
  commandCenterApi,
} from "@/lib/api/modules/notifications-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useSessionStore } from "@/store/session-store";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Database,
  FileText,
  FolderOpen,
  HeartPulse,
  LineChart,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const ACTIVITY_SKELETON_KEYS = [
  "activity-skeleton-1",
  "activity-skeleton-2",
  "activity-skeleton-3",
  "activity-skeleton-4",
  "activity-skeleton-5",
];

function ActionBadge({ action }: { action: string }) {
  const map: Record<string, string> = {
    create: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    update: "bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400",
    approve: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
    reject: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
    archive: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${map[action] ?? map.update}`}
    >
      {action}
    </span>
  );
}

function ActivityRow({ item }: { item: ActivityFeedItem }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground capitalize">
            {item.entity}
          </span>
          <ActionBadge action={item.type} />
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(item.timestamp).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

export function CommandCenterPage() {
  const activeOrganizationId = useSessionStore(
    (state) => state.activeOrganizationId,
  );
  const hasActiveOrganization = Boolean(activeOrganizationId);

  const [windowDays, setWindowDays] = useState(30);
  const [limit, setLimit] = useState(12);
  const [interval, setInterval] = useState<"day" | "week">("day");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const portfolioQuery = useQuery({
    queryKey: queryKeys.commandCenter.portfolio({ limit, windowDays }),
    queryFn: () => commandCenterApi.portfolio({ limit, windowDays }),
    enabled: hasActiveOrganization,
    staleTime: 30_000,
    retry: 2,
  });

  const projectId =
    selectedProjectId || portfolioQuery.data?.projects[0]?.projectId || "";

  const overviewQuery = useQuery({
    queryKey: queryKeys.commandCenter.overview(projectId, windowDays),
    queryFn: () => commandCenterApi.overview(projectId, windowDays),
    enabled: hasActiveOrganization && Boolean(projectId),
    staleTime: 30_000,
    retry: 2,
  });

  const healthQuery = useQuery({
    queryKey: queryKeys.commandCenter.health(projectId, windowDays),
    queryFn: () => commandCenterApi.health(projectId, windowDays),
    enabled: hasActiveOrganization && Boolean(projectId),
    staleTime: 30_000,
    retry: 2,
  });

  const trendsQuery = useQuery({
    queryKey: queryKeys.commandCenter.trends({
      projectId,
      windowDays,
      interval,
    }),
    queryFn: () =>
      commandCenterApi.trends({
        projectId,
        windowDays,
        interval,
      }),
    enabled: hasActiveOrganization && Boolean(projectId),
    staleTime: 30_000,
    retry: 2,
  });

  const feedQuery = useQuery({
    queryKey: queryKeys.activityFeed.list({ page: 1, pageSize: 10, projectId }),
    queryFn: () =>
      activityFeedApi.list({
        page: 1,
        pageSize: 10,
        projectId: projectId || undefined,
      }),
    enabled: hasActiveOrganization,
    staleTime: 15_000,
    retry: 2,
  });

  const { isLoading } = portfolioQuery;
  const feed = feedQuery.data;
  const feedLoading = feedQuery.isLoading;
  const portfolio = portfolioQuery.data;

  const anyError =
    portfolioQuery.isError ||
    overviewQuery.isError ||
    healthQuery.isError ||
    trendsQuery.isError ||
    feedQuery.isError;

  const isStale =
    portfolioQuery.isStale ||
    overviewQuery.isStale ||
    healthQuery.isStale ||
    trendsQuery.isStale ||
    feedQuery.isStale;

  const updatedAt = useMemo(() => {
    const timestamps = [
      portfolioQuery.dataUpdatedAt,
      overviewQuery.dataUpdatedAt,
      healthQuery.dataUpdatedAt,
      trendsQuery.dataUpdatedAt,
      feedQuery.dataUpdatedAt,
    ].filter((value) => value > 0);

    if (timestamps.length === 0) {
      return null;
    }

    return Math.max(...timestamps);
  }, [
    feedQuery.dataUpdatedAt,
    healthQuery.dataUpdatedAt,
    overviewQuery.dataUpdatedAt,
    portfolioQuery.dataUpdatedAt,
    trendsQuery.dataUpdatedAt,
  ]);

  const refetchAll = async () => {
    await Promise.all([
      portfolioQuery.refetch(),
      overviewQuery.refetch(),
      healthQuery.refetch(),
      trendsQuery.refetch(),
      feedQuery.refetch(),
    ]);
  };

  if (!hasActiveOrganization) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Real-time operational overview across all active projects."
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/organization-setup">Set up organization</Link>
            </Button>
          }
        />

        <EmptyState
          icon={FolderOpen}
          title="Organization required"
          description="Create or select an organization to load dashboard metrics, activity, and portfolio health."
          action={{
            label: "Open organization setup",
            onClick: () => {
              window.location.assign("/organization-setup");
            },
          }}
        />
      </div>
    );
  }

  const summary = summarizePortfolioProjects(portfolio?.projects ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Real-time operational overview across all active projects."
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void refetchAll();
              }}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Refresh
            </Button>
            {anyError && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void refetchAll();
                }}
              >
                Retry failed
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <Link href="/activity-feed">Activity feed</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/audit-log">Audit log</Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <div className="w-56">
          <Select
            value={projectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            placeholder="Select project"
            disabled={
              portfolioQuery.isLoading ||
              (portfolio?.projects.length ?? 0) === 0
            }
          >
            {(portfolio?.projects ?? []).map((project) => (
              <option key={project.projectId} value={project.projectId}>
                {project.projectCode} - {project.projectName}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select
            value={String(windowDays)}
            onChange={(event) => setWindowDays(Number(event.target.value))}
          >
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
          </Select>
        </div>
        <div className="w-32">
          <Select
            value={interval}
            onChange={(event) =>
              setInterval(event.target.value as "day" | "week")
            }
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
          </Select>
        </div>
        <div className="w-40">
          <Select
            value={String(limit)}
            onChange={(event) => setLimit(Number(event.target.value))}
          >
            <option value="8">Top 8 projects</option>
            <option value="12">Top 12 projects</option>
            <option value="20">Top 20 projects</option>
          </Select>
        </div>
        <p className="ml-auto text-xs text-muted-foreground">
          {updatedAt
            ? `Last updated ${new Date(updatedAt).toLocaleTimeString()}`
            : "No data loaded yet"}
        </p>
        {isStale && (
          <p className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            Data may be stale
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Active projects"
          value={isLoading ? "—" : (portfolio?.projectCount ?? 0)}
          subtitle={`${portfolio?.criticalProjects ?? 0} critical`}
          icon={FolderOpen}
          isLoading={isLoading}
        />
        <StatCard
          title="Open change orders"
          value={isLoading ? "—" : summary.openChangeOrders}
          icon={CheckCircle}
          isLoading={isLoading}
        />
        <StatCard
          title="Pending pay apps"
          value={isLoading ? "—" : summary.pendingPayApplications}
          icon={Clock}
          isLoading={isLoading}
        />
        <StatCard
          title="Overdue compliance"
          value={isLoading ? "—" : summary.overdueComplianceItems}
          icon={AlertTriangle}
          isLoading={isLoading}
        />
        <StatCard
          title="High-risk alerts"
          value={isLoading ? "—" : summary.highRiskBudgetAlerts}
          icon={BarChart3}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Health</h2>
          </div>
          {healthQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : healthQuery.data ? (
            <div className="space-y-3 text-sm">
              <p className="text-foreground">
                Score:{" "}
                <span className="font-semibold">{healthQuery.data.score}</span>{" "}
                ({healthQuery.data.status})
              </p>
              <div className="space-y-2">
                {healthQuery.data.factors.slice(0, 4).map((factor) => (
                  <div
                    key={factor.key}
                    className="flex items-center justify-between"
                  >
                    <span className="text-muted-foreground">
                      {factor.label}
                    </span>
                    <span className="font-medium text-foreground">
                      {factor.impactBps > 0 ? "+" : ""}
                      {factor.impactBps} bps
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={HeartPulse}
              title="No health data"
              description="Select a project to view health metrics."
              className="rounded-none border-0"
            />
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <LineChart className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Trends</h2>
          </div>
          {trendsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : trendsQuery.data ? (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                Direction:{" "}
                <span className="font-medium text-foreground">
                  {trendsQuery.data.summary.trendDirection}
                </span>
              </p>
              <p className="text-muted-foreground">
                Risk pressure delta:{" "}
                <span className="font-medium text-foreground">
                  {trendsQuery.data.summary.pressureDelta}
                </span>
              </p>
              <div className="space-y-1 pt-1">
                {trendsQuery.data.series.slice(-4).map((point) => (
                  <div
                    key={point.period}
                    className="flex items-center justify-between"
                  >
                    <span className="text-muted-foreground">
                      {point.period}
                    </span>
                    <span className="font-medium text-foreground">
                      pressure {point.riskPressureScore}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={LineChart}
              title="No trend data"
              description="Select a project to view trend metrics."
              className="rounded-none border-0"
            />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Selected project overview
          </h2>
        </div>
        {overviewQuery.isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : overviewQuery.data ? (
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Budget burn</p>
              <p className="mt-1 font-semibold text-foreground">
                {overviewQuery.data.summary.budgetBurnBps / 100}%
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Open COs</p>
              <p className="mt-1 font-semibold text-foreground">
                {overviewQuery.data.summary.openChangeOrders}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">
                Overdue compliance
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {overviewQuery.data.summary.overdueComplianceItems}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Match success</p>
              <p className="mt-1 font-semibold text-foreground">
                {overviewQuery.data.summary.matchSuccessRateBps / 100}%
              </p>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Database}
            title="No overview"
            description="Select a project to view aggregated metrics."
            className="rounded-none border-0"
          />
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Portfolio health
        </h2>
        {portfolioQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (portfolio?.projects.length ?? 0) === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No projects in portfolio"
            description="Create or activate projects to populate command center signals."
            className="rounded-none border-0"
          />
        ) : (
          <div className="space-y-2">
            {(portfolio?.projects ?? []).map((project) => (
              <button
                type="button"
                key={project.projectId}
                onClick={() => setSelectedProjectId(project.projectId)}
                className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left hover:bg-muted/40"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {project.projectCode} - {project.projectName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status: {project.health.status}
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {project.health.score}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Activity feed */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Recent activity
          </h2>
        </div>
        <div className="divide-y divide-border px-5">
          {feedLoading ? (
            ACTIVITY_SKELETON_KEYS.map((rowKey) => (
              <div key={rowKey} className="py-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-1.5 h-3 w-1/3" />
              </div>
            ))
          ) : (feed?.items ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No recent activity
            </p>
          ) : (
            (feed?.items ?? []).map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
