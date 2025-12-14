"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { portalApi } from "@/lib/api/modules/portal-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { formatPortalDate, formatPortalDateTime } from "../lib/portal-utils";

interface PortalDailyLogDetailPageProps {
  dailyLogId: string;
}

export function PortalDailyLogDetailPage({
  dailyLogId,
}: PortalDailyLogDetailPageProps) {
  const detailQuery = useQuery({
    queryKey: queryKeys.portal.dailyLogs.detail(dailyLogId),
    queryFn: () => portalApi.getDailyLog(dailyLogId),
  });

  if (detailQuery.isLoading) {
    return <LoadingState title="Loading daily log detail" rows={4} />;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <ErrorState
        title="Unable to load daily log"
        description="This record may be unavailable or your session may have expired."
        onRetry={() => {
          void detailQuery.refetch();
        }}
      />
    );
  }

  const dailyLog = detailQuery.data.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily log detail"
        description={`ID ${dailyLog.id}`}
        action={
          <Link
            href="/portal/daily-logs"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to daily logs
          </Link>
        }
      />

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Review status
            </p>
            <div className="mt-1">
              <StatusBadge status={dailyLog.reviewStatus} />
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Log date
            </p>
            <p className="mt-1 text-sm text-foreground">
              {formatPortalDate(dailyLog.logDate)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Labor count
            </p>
            <p className="mt-1 text-sm text-foreground">
              {dailyLog.laborCount}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Submitted
            </p>
            <p className="mt-1 text-sm text-foreground">
              {formatPortalDateTime(dailyLog.submittedAt)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Performed work
            </p>
            <p className="mt-1 text-foreground">{dailyLog.performedWork}</p>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Equipment used
            </p>
            <p className="mt-1 text-foreground">
              {dailyLog.equipmentUsed?.length
                ? dailyLog.equipmentUsed.join(", ")
                : "-"}
            </p>
            <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
              Attachments
            </p>
            <p className="mt-1 text-foreground">
              {dailyLog.attachments?.length
                ? dailyLog.attachments.join(", ")
                : "-"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">
          Review timeline
        </h2>
        <div className="mt-3 space-y-2">
          {dailyLog.timeline.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No timeline entries"
              description="Status history will appear once reviewer actions are recorded."
            />
          ) : (
            dailyLog.timeline.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <StatusBadge status={event.status} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.actorType} • {event.actorId}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatPortalDateTime(event.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
