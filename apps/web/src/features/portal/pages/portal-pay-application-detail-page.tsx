"use client";

import type { DataTableColumn } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  type PortalPayApplicationLineItem,
  portalApi,
} from "@/lib/api/modules/portal-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import Link from "next/link";
import { formatPortalCents, formatPortalDateTime } from "../lib/portal-utils";

interface PortalPayApplicationDetailPageProps {
  payApplicationId: string;
}

export function PortalPayApplicationDetailPage({
  payApplicationId,
}: PortalPayApplicationDetailPageProps) {
  const detailQuery = useQuery({
    queryKey: queryKeys.portal.payApplications.detail(payApplicationId),
    queryFn: () => portalApi.getPayApplication(payApplicationId),
  });

  const itemColumns: DataTableColumn<PortalPayApplicationLineItem>[] = [
    {
      key: "description",
      header: "Description",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.description}</p>
          <p className="text-xs text-muted-foreground">
            {row.costCode || "No cost code"}
          </p>
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      render: (row) => row.quantityUnits,
    },
    {
      key: "unitAmount",
      header: "Unit",
      render: (row) =>
        row.unitAmountCents == null
          ? "-"
          : formatPortalCents(row.unitAmountCents),
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => formatPortalCents(row.amountCents),
    },
  ];

  if (detailQuery.isLoading) {
    return <LoadingState title="Loading pay application detail" rows={4} />;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <ErrorState
        title="Unable to load pay application"
        description="This record may be unavailable or your session may have expired."
        onRetry={() => {
          void detailQuery.refetch();
        }}
      />
    );
  }

  const payApplication = detailQuery.data.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pay application detail"
        description={`ID ${payApplication.id}`}
        action={
          <Link
            href="/portal/pay-applications"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to pay applications
          </Link>
        }
      />

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Status
            </p>
            <div className="mt-1">
              <StatusBadge status={payApplication.status} />
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {formatPortalCents(
                payApplication.totalAmountCents,
                payApplication.currency,
              )}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Submitted
            </p>
            <p className="mt-1 text-sm text-foreground">
              {formatPortalDateTime(payApplication.submittedAt)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Reviewed
            </p>
            <p className="mt-1 text-sm text-foreground">
              {formatPortalDateTime(payApplication.reviewedAt)}
            </p>
          </div>
        </div>

        {payApplication.summary ? (
          <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
            {payApplication.summary}
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Line items</h2>
        <DataTable
          columns={itemColumns}
          data={payApplication.lineItems}
          rowKey={(row) => row.id}
          emptyState={
            <EmptyState
              icon={FileText}
              title="No line items"
              description="No billing line items were recorded for this pay application."
              className="border-none"
            />
          }
        />
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">
          Review timeline
        </h2>
        <div className="mt-3 space-y-2">
          {payApplication.timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No timeline entries.
            </p>
          ) : (
            payApplication.timeline.map((event) => (
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
