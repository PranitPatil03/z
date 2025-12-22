"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { type BillingRecord, billingApi } from "@/lib/api/modules/billing-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useQuery } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";

function formatCents(c: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(c / 100);
}

export function BillingPage() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.billing.list(),
    queryFn: () => billingApi.list(),
  });

  const columns: DataTableColumn<BillingRecord>[] = [
    {
      key: "description",
      header: "Description",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground capitalize">{row.type}</p>
          {row.description && (
            <p className="text-xs text-muted-foreground">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "130px",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "amount",
      header: "Amount",
      width: "130px",
      render: (row) => (
        <span className="font-medium">{formatCents(row.amountCents)}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      width: "150px",
      render: (row) => (
        <span className="text-muted-foreground">
          {new Date(row.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "stripeId",
      header: "Stripe ID",
      width: "180px",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.stripeId ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="View payment history and manage your subscription."
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        rowKey={(r) => r.id}
        emptyState={
          <EmptyState
            icon={CreditCard}
            title="No billing records"
            description="Payment history will appear here once you have an active subscription."
          />
        }
      />
    </div>
  );
}
