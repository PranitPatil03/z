"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getLifecycleConfirmationMessage,
  requiresLifecycleConfirmation,
} from "@/features/procurement/lib/procurement-forms";
import {
  type POStatus,
  purchaseOrdersApi,
} from "@/lib/api/modules/purchase-orders-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PurchaseOrderDetailPageProps {
  purchaseOrderId: string;
}

const STATUS_OPTIONS: POStatus[] = [
  "draft",
  "issued",
  "approved",
  "closed",
  "canceled",
];

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

function toDateInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function centsToDollars(value: number) {
  return (value / 100).toFixed(2);
}

export function PurchaseOrderDetailPage({
  purchaseOrderId,
}: PurchaseOrderDetailPageProps) {
  const qc = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    vendorName: "",
    currency: "USD",
    totalAmount: "",
    issueDate: "",
    status: "draft" as POStatus,
  });

  const query = useQuery({
    queryKey: queryKeys.purchaseOrders.detail(purchaseOrderId),
    queryFn: () => purchaseOrdersApi.get(purchaseOrderId),
  });

  const purchaseOrder = query.data;

  useEffect(() => {
    if (!purchaseOrder) {
      return;
    }

    setForm({
      vendorName: purchaseOrder.vendorName,
      currency: purchaseOrder.currency,
      totalAmount: centsToDollars(purchaseOrder.totalAmountCents),
      issueDate: toDateInputValue(purchaseOrder.issueDate),
      status: purchaseOrder.status,
    });
  }, [purchaseOrder]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const totalAmountCents = Math.round(
        Number.parseFloat(form.totalAmount) * 100,
      );
      return purchaseOrdersApi.update(purchaseOrderId, {
        vendorName: form.vendorName,
        currency: form.currency,
        totalAmountCents,
        issueDate: form.issueDate
          ? new Date(form.issueDate).toISOString()
          : undefined,
        status: form.status,
      });
    },
    onSuccess: () => {
      toast.success("Purchase order updated");
      setFormError(null);
      qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      qc.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.detail(purchaseOrderId),
      });
    },
    onError: (error: Error) => {
      setFormError(error.message);
      toast.error(error.message);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => purchaseOrdersApi.archive(purchaseOrderId),
    onSuccess: () => {
      toast.success("Purchase order archived");
      qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    if (!purchaseOrder) {
      return;
    }

    if (!form.vendorName.trim()) {
      setFormError("Vendor name is required");
      return;
    }

    const parsedAmount = Number.parseFloat(form.totalAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setFormError("Total amount must be a valid non-negative number");
      return;
    }

    if (
      requiresLifecycleConfirmation(
        "purchaseOrder",
        purchaseOrder.status,
        form.status,
      ) &&
      !window.confirm(
        getLifecycleConfirmationMessage(
          "purchaseOrder",
          purchaseOrder.status,
          form.status,
        ),
      )
    ) {
      return;
    }

    setFormError(null);
    updateMutation.mutate();
  };

  const handleArchive = () => {
    if (!window.confirm("Archive this purchase order?")) {
      return;
    }

    archiveMutation.mutate();
  };

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Purchase Order"
          description="Loading purchase order..."
        />
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Purchase Order"
          description="The purchase order was not found."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/purchase-orders">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to POs
              </Link>
            </Button>
          }
        />
        <EmptyState
          title="Purchase order unavailable"
          description="Return to the purchase order list and try again."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={purchaseOrder.poNumber}
        description={`PO ID: ${purchaseOrder.id}`}
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/purchase-orders">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchive}
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-4 w-4" />
              )}
              Archive
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-2">
            <StatusBadge status={purchaseOrder.status} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Issued</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {formatDate(purchaseOrder.issueDate)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Amount</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            ${centsToDollars(purchaseOrder.totalAmountCents)}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Edit Purchase Order
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="po-vendor">Vendor name</Label>
            <Input
              id="po-vendor"
              value={form.vendorName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  vendorName: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="po-currency">Currency</Label>
            <Input
              id="po-currency"
              value={form.currency}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  currency: event.target.value.toUpperCase(),
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="po-amount">Total amount (USD)</Label>
            <Input
              id="po-amount"
              type="number"
              min="0"
              step="0.01"
              value={form.totalAmount}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  totalAmount: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="po-issue-date">Issue date</Label>
            <Input
              id="po-issue-date"
              type="date"
              value={form.issueDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  issueDate: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="po-status">Status</Label>
            <Select
              id="po-status"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as POStatus,
                }))
              }
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status} className="capitalize">
                  {status}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {formError && (
          <p className="mt-3 text-xs text-destructive">{formError}</p>
        )}

        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save changes
          </Button>
        </div>
      </section>
    </div>
  );
}
