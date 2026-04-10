"use client";

import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  type PortalPayApplication,
  type PortalPayApplicationStatus,
  portalApi,
} from "@/lib/api/modules/portal-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  formatPortalCents,
  formatPortalDate,
  formatPortalDateTime,
  toIsoOrUndefined,
} from "../lib/portal-utils";

interface EditableLineItem {
  id: string;
  description: string;
  amountCents: string;
  costCode: string;
  quantityUnits: string;
  unitAmountCents: string;
}

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "paid", label: "Paid" },
];

function createLineItem(id: string): EditableLineItem {
  return {
    id,
    description: "",
    amountCents: "",
    costCode: "",
    quantityUnits: "",
    unitAmountCents: "",
  };
}

export function PortalPayApplicationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [limit, setLimit] = useState("50");
  const [form, setForm] = useState({
    periodStart: "",
    periodEnd: "",
    summary: "",
    currency: "USD",
    lineItems: [createLineItem("line-1")],
  });

  const listParams = useMemo(
    () => ({
      status: (statusFilter || undefined) as
        | PortalPayApplicationStatus
        | undefined,
      limit: Number.parseInt(limit, 10) || 50,
    }),
    [limit, statusFilter],
  );

  const payApplicationsQuery = useQuery({
    queryKey: queryKeys.portal.payApplications.list(listParams),
    queryFn: () => portalApi.listPayApplications(listParams),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const periodStart = toIsoOrUndefined(form.periodStart);
      const periodEnd = toIsoOrUndefined(form.periodEnd);
      if (!periodStart || !periodEnd) {
        throw new Error("Period start and period end are required");
      }

      const lineItems = form.lineItems
        .filter((item) => item.description.trim().length > 0)
        .map((item) => {
          const amountCents = Number.parseInt(item.amountCents, 10);
          if (!Number.isFinite(amountCents) || amountCents < 0) {
            throw new Error("Line item amounts must be non-negative integers");
          }

          const quantityUnits = item.quantityUnits.trim().length
            ? Number.parseInt(item.quantityUnits, 10)
            : undefined;
          const unitAmountCents = item.unitAmountCents.trim().length
            ? Number.parseInt(item.unitAmountCents, 10)
            : undefined;

          return {
            description: item.description.trim(),
            amountCents,
            costCode: item.costCode.trim() || undefined,
            quantityUnits,
            unitAmountCents,
          };
        });

      if (lineItems.length === 0) {
        throw new Error("At least one line item is required");
      }

      return portalApi.createPayApplication({
        periodStart,
        periodEnd,
        summary: form.summary.trim() || undefined,
        currency: form.currency.trim() || undefined,
        lineItems,
      });
    },
    onSuccess: (result) => {
      toast.success("Pay application submitted");
      setForm({
        periodStart: "",
        periodEnd: "",
        summary: "",
        currency: "USD",
        lineItems: [createLineItem("line-1")],
      });

      void queryClient.invalidateQueries({
        queryKey: queryKeys.portal.payApplications.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.portal.overview(),
      });
      router.push(`/portal/pay-applications/${result.data.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Unable to submit pay application");
    },
  });

  const columns: DataTableColumn<PortalPayApplication>[] = [
    {
      key: "id",
      header: "Pay app",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.id}</p>
          <p className="text-xs text-muted-foreground">
            {formatPortalDate(row.periodStart)} to{" "}
            {formatPortalDate(row.periodEnd)}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "total",
      header: "Total",
      render: (row) => formatPortalCents(row.totalAmountCents, row.currency),
    },
    {
      key: "submittedAt",
      header: "Submitted",
      render: (row) => formatPortalDateTime(row.submittedAt),
    },
  ];

  if (payApplicationsQuery.isLoading) {
    return <LoadingState title="Loading pay applications" rows={4} />;
  }

  if (payApplicationsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load pay applications"
        description="Please retry after refreshing your portal session."
        onRetry={() => {
          void payApplicationsQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pay Applications"
        description="Submit payment requests and track reviewer decisions."
      />

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">
          Submit pay application
        </h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="portal-pay-period-start">Period start</Label>
            <Input
              id="portal-pay-period-start"
              type="datetime-local"
              value={form.periodStart}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  periodStart: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portal-pay-period-end">Period end</Label>
            <Input
              id="portal-pay-period-end"
              type="datetime-local"
              value={form.periodEnd}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  periodEnd: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portal-pay-currency">Currency</Label>
            <Input
              id="portal-pay-currency"
              value={form.currency}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  currency: event.target.value,
                }))
              }
              maxLength={3}
              placeholder="USD"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="portal-pay-summary">Summary</Label>
            <textarea
              id="portal-pay-summary"
              rows={3}
              value={form.summary}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  summary: event.target.value,
                }))
              }
              className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Brief summary of billed scope"
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Line items
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  lineItems: [
                    ...current.lineItems,
                    createLineItem(`line-${current.lineItems.length + 1}`),
                  ],
                }))
              }
            >
              Add line item
            </Button>
          </div>

          {form.lineItems.map((item, index) => (
            <div key={item.id} className="rounded-lg border border-border p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Line item {index + 1}
                </p>
                {form.lineItems.length > 1 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        lineItems: current.lineItems.filter(
                          (lineItem) => lineItem.id !== item.id,
                        ),
                      }))
                    }
                  >
                    Remove
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={item.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      lineItems: current.lineItems.map((lineItem) =>
                        lineItem.id === item.id
                          ? { ...lineItem, description: event.target.value }
                          : lineItem,
                      ),
                    }))
                  }
                  placeholder="Description"
                />
                <Input
                  value={item.amountCents}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      lineItems: current.lineItems.map((lineItem) =>
                        lineItem.id === item.id
                          ? { ...lineItem, amountCents: event.target.value }
                          : lineItem,
                      ),
                    }))
                  }
                  inputMode="numeric"
                  placeholder="Amount cents"
                />
                <Input
                  value={item.costCode}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      lineItems: current.lineItems.map((lineItem) =>
                        lineItem.id === item.id
                          ? { ...lineItem, costCode: event.target.value }
                          : lineItem,
                      ),
                    }))
                  }
                  placeholder="Cost code (optional)"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={item.quantityUnits}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        lineItems: current.lineItems.map((lineItem) =>
                          lineItem.id === item.id
                            ? { ...lineItem, quantityUnits: event.target.value }
                            : lineItem,
                        ),
                      }))
                    }
                    inputMode="numeric"
                    placeholder="Qty"
                  />
                  <Input
                    value={item.unitAmountCents}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        lineItems: current.lineItems.map((lineItem) =>
                          lineItem.id === item.id
                            ? {
                                ...lineItem,
                                unitAmountCents: event.target.value,
                              }
                            : lineItem,
                        ),
                      }))
                    }
                    inputMode="numeric"
                    placeholder="Unit cents"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            Submit pay application
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status.value || "all"} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
          <Input
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            inputMode="numeric"
            placeholder="Result limit"
          />
        </div>

        <DataTable
          columns={columns}
          data={payApplicationsQuery.data?.data ?? []}
          rowKey={(row) => row.id}
          onRowClick={(row) =>
            router.push(`/portal/pay-applications/${row.id}`)
          }
          emptyState={
            <EmptyState
              icon={FileText}
              title="No pay applications"
              description="Submit your first pay application to start the approval lifecycle."
              className="border-none"
            />
          }
        />
      </section>
    </div>
  );
}
