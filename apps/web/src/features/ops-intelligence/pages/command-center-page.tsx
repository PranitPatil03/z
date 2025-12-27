"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-radix";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { summarizePortfolioProjects } from "@/features/ops-intelligence/lib/ops-intelligence-utils";
import { ApiRequestError } from "@/lib/api/http-client";
import {
  type ActivityFeedItem,
  activityFeedApi,
  commandCenterApi,
} from "@/lib/api/modules/notifications-api";
import { queryKeys } from "@/lib/api/query-keys";
import { authClient } from "@/lib/auth-client";
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
  LayoutGrid,
  Loader2,
  List,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const ACTIVITY_SKELETON_KEYS = [
  "activity-skeleton-1",
  "activity-skeleton-2",
  "activity-skeleton-3",
  "activity-skeleton-4",
  "activity-skeleton-5",
];

type SessionWithActiveOrganization = {
  activeOrganizationId?: string;
};

function shouldRetryQuery(failureCount: number, error: unknown) {
  if (error instanceof ApiRequestError && error.status >= 400 && error.status < 500) {
    return false;
  }

  return failureCount < 2;
}

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
  const { data: sessionData } = authClient.useSession();
  const sessionResolved = typeof sessionData !== "undefined";
  const activeOrganizationIdFromSession =
    sessionData?.session && "activeOrganizationId" in sessionData.session
      ? ((sessionData.session as SessionWithActiveOrganization)
          .activeOrganizationId ?? null)
      : null;
  const storedActiveOrganizationId = useSessionStore(
    (state) => state.activeOrganizationId,
  );
  const activeOrganizationId =
    sessionResolved && sessionData?.user
      ? activeOrganizationIdFromSession
      : activeOrganizationIdFromSession ?? storedActiveOrganizationId;
  const hasActiveOrganization = Boolean(activeOrganizationId);
  const portfolioLimit = 50;

  const [windowDays, setWindowDays] = useState(30);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [portfolioView, setPortfolioView] = useState<"cards" | "list">(
    "cards",
  );

  const portfolioQuery = useQuery({
    queryKey: queryKeys.commandCenter.portfolio({
      limit: portfolioLimit,
      windowDays,
    }),
    queryFn: () =>
      commandCenterApi.portfolio({
        limit: portfolioLimit,
        windowDays,
      }),
    enabled: hasActiveOrganization,
    staleTime: 30_000,
    retry: shouldRetryQuery,
  });

  const projectId =
    selectedProjectId || portfolioQuery.data?.projects[0]?.projectId || "";

  const overviewQuery = useQuery({
    queryKey: queryKeys.commandCenter.overview(projectId, windowDays),
    queryFn: () => commandCenterApi.overview(projectId, windowDays),
    enabled: hasActiveOrganization && Boolean(projectId),
    staleTime: 30_000,
    retry: shouldRetryQuery,
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
    retry: shouldRetryQuery,
  });

  const { isLoading } = portfolioQuery;
  const feed = feedQuery.data;
  const feedLoading = feedQuery.isLoading;
  const portfolio = portfolioQuery.data;

  const anyError =
    portfolioQuery.isError ||
    overviewQuery.isError ||
    feedQuery.isError;

  const refetchAll = async () => {
    const refetchTasks: Array<Promise<unknown>> = [
      portfolioQuery.refetch(),
      feedQuery.refetch(),
    ];
    if (projectId) {
      refetchTasks.push(overviewQuery.refetch());
    }

    await Promise.all(refetchTasks);
  };

  if (!sessionResolved || !sessionData?.user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2
          className="h-5 w-5 animate-spin text-muted-foreground"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!hasActiveOrganization) {
    return (
      <div className="space-y-6">
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
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-card p-3">
        <div className="w-full sm:w-64 lg:w-72">
          <Select
            value={projectId}
            onValueChange={setSelectedProjectId}
            disabled={
              portfolioQuery.isLoading ||
              (portfolio?.projects.length ?? 0) === 0
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {(portfolio?.projects ?? []).map((project) => (
                <SelectItem key={project.projectId} value={project.projectId}>
                  {project.projectCode} - {project.projectName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Select value={String(windowDays)} onValueChange={(value) => setWindowDays(Number(value))}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Window" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
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
          title="Avg health score"
          value={isLoading ? "—" : (portfolio?.averageHealthScore ?? 0)}
          subtitle={`${portfolio?.watchProjects ?? 0} watch`}
          icon={BarChart3}
          isLoading={isLoading}
        />
        <StatCard
          title="High-risk alerts"
          value={isLoading ? "—" : summary.highRiskBudgetAlerts}
          icon={AlertTriangle}
          isLoading={isLoading}
        />
      </div>

      <div className="rounded-xl bg-card p-4">
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
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Budget burn</p>
              <p className="mt-1 font-semibold text-foreground">
                {overviewQuery.data.summary.budgetBurnBps / 100}%
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Open COs</p>
              <p className="mt-1 font-semibold text-foreground">
                {overviewQuery.data.summary.openChangeOrders}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                Overdue compliance
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {overviewQuery.data.summary.overdueComplianceItems}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
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

      <div className="rounded-xl bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Portfolio health
          </h2>
          <div className="inline-flex items-center rounded-md border border-border bg-muted/30 p-0.5">
            <Button
              type="button"
              size="sm"
              variant={portfolioView === "cards" ? "secondary" : "ghost"}
              className="h-8 px-2"
              onClick={() => setPortfolioView("cards")}
              aria-label="Card view"
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={portfolioView === "list" ? "secondary" : "ghost"}
              className="h-8 px-2"
              onClick={() => setPortfolioView("list")}
              aria-label="List view"
              title="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
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
          portfolioView === "cards" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(portfolio?.projects ?? []).map((project) => (
                <button
                  type="button"
                  key={project.projectId}
                  onClick={() => setSelectedProjectId(project.projectId)}
                  className={`rounded-xl p-4 text-left transition ${
                    project.projectId === projectId
                      ? "bg-primary/10 ring-1 ring-primary/40"
                      : "bg-muted/40 hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {project.projectCode}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {project.projectName}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-foreground">
                      {project.health.score}
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Status: {project.health.status}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {(portfolio?.projects ?? []).map((project) => (
                <button
                  type="button"
                  key={project.projectId}
                  onClick={() => setSelectedProjectId(project.projectId)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition ${
                    project.projectId === projectId
                      ? "bg-primary/10 ring-1 ring-primary/40"
                      : "bg-muted/40 hover:bg-muted/60"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {project.projectCode}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {project.projectName}
                    </p>
                  </div>
                  <div className="ml-3 text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {project.health.score}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {project.health.status}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </div>

      {/* Activity feed */}
      <div className="w-full rounded-xl border border-border bg-card">
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
