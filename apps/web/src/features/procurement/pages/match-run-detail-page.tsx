"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { matchRunsApi } from "@/lib/api/modules/match-runs-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface MatchRunDetailPageProps {
  matchRunId: string;
}

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MatchRunDetailPage({ matchRunId }: MatchRunDetailPageProps) {
  const query = useQuery({
    queryKey: queryKeys.matchRuns.detail(matchRunId),
    queryFn: () => matchRunsApi.get(matchRunId),
  });

  const run = query.data;

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Match Run"
          description="Loading match run details..."
        />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Match Run"
          description="The match run was not found."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/match-runs">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to match runs
              </Link>
            </Button>
          }
        />
        <EmptyState
          title="Match run unavailable"
          description="Return to the match run list and select another item."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Match Run ${run.id}`}
        description="Detailed 3-way matching output and variance signals."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/match-runs">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Result</p>
          <div className="mt-2">
            <StatusBadge status={run.result} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Variance</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {formatCents(run.varianceCents)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Created</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {formatDate(run.createdAt)}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Run Context
        </h2>
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <p className="text-muted-foreground">
            Project ID:{" "}
            <span className="font-mono text-foreground">{run.projectId}</span>
          </p>
          <p className="text-muted-foreground">
            Invoice ID:{" "}
            <span className="font-mono text-foreground">{run.invoiceId}</span>
          </p>
          <p className="text-muted-foreground">
            PO ID:{" "}
            <span className="font-mono text-foreground">
              {run.purchaseOrderId ?? "-"}
            </span>
          </p>
          <p className="text-muted-foreground">
            Receipt ID:{" "}
            <span className="font-mono text-foreground">
              {run.receiptId ?? "-"}
            </span>
          </p>
          <p className="text-muted-foreground">
            Tolerance:{" "}
            <span className="font-medium text-foreground">
              {run.toleranceBps} bps
            </span>
          </p>
          <p className="text-muted-foreground">
            Created by:{" "}
            <span className="font-mono text-foreground">
              {run.createdByUserId}
            </span>
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-base font-semibold text-foreground">
          Match Details
        </h2>
        <pre className="overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          {JSON.stringify(run.details ?? {}, null, 2)}
        </pre>
      </section>
    </div>
  );
}
