"use client";

import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { portalApi } from "@/lib/api/modules/portal-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ClipboardList,
  FileText,
  ShieldCheck,
} from "lucide-react";

function formatCents(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
}

export default function PortalOverviewPage() {
  const overviewQuery = useQuery({
    queryKey: queryKeys.portal.overview(),
    queryFn: () => portalApi.getOverview(),
  });

  if (overviewQuery.isLoading) {
    return <LoadingState title="Loading portal overview" rows={4} />;
  }

  if (overviewQuery.isError || !overviewQuery.data) {
    return (
      <ErrorState
        title="Unable to load portal overview"
        description="Your session may be expired. Please sign in again."
        onRetry={() => {
          void overviewQuery.refetch();
        }}
      />
    );
  }

  const overview = overviewQuery.data.data;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-semibold text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {overview.subcontractor.name}
          {overview.project ? ` • ${overview.project.name}` : ""}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Compliance Pending"
          value={overview.complianceSummary.pending}
          subtitle={`${overview.complianceSummary.total} total items`}
          icon={ShieldCheck}
        />
        <StatCard
          title="Due Soon"
          value={overview.complianceSummary.dueSoon}
          subtitle="Next 14 days"
          icon={AlertTriangle}
        />
        <StatCard
          title="Recent Pay Apps"
          value={overview.timeline.payApplications.length}
          subtitle="Last 10 records"
          icon={FileText}
        />
        <StatCard
          title="Recent Daily Logs"
          value={overview.timeline.dailyLogs.length}
          subtitle="Last 10 records"
          icon={ClipboardList}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Recent Pay Applications
          </h2>
          <div className="mt-3 space-y-2">
            {overview.timeline.payApplications.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pay applications yet.
              </p>
            ) : (
              overview.timeline.payApplications.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {item.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Updated {new Date(item.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {formatCents(item.totalAmountCents)}
                    </p>
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Recent Daily Logs
          </h2>
          <div className="mt-3 space-y-2">
            {overview.timeline.dailyLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No daily logs yet.
              </p>
            ) : (
              overview.timeline.dailyLogs.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {item.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.logDate).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={item.reviewStatus} />
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
