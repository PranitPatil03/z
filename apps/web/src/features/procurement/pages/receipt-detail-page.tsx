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
  type ReceiptStatus,
  receiptsApi,
} from "@/lib/api/modules/receipts-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ReceiptDetailPageProps {
  receiptId: string;
}

const STATUS_OPTIONS: ReceiptStatus[] = ["received", "verified", "rejected"];

function toDateInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function centsToDollars(value: number) {
  return (value / 100).toFixed(2);
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

export function ReceiptDetailPage({ receiptId }: ReceiptDetailPageProps) {
  const qc = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    receivedAmount: "",
    receivedAt: "",
    notes: "",
    status: "received" as ReceiptStatus,
  });

  const query = useQuery({
    queryKey: queryKeys.receipts.detail(receiptId),
    queryFn: () => receiptsApi.get(receiptId),
  });

  const receipt = query.data;

  useEffect(() => {
    if (!receipt) {
      return;
    }

    setForm({
      receivedAmount: centsToDollars(receipt.receivedAmountCents),
      receivedAt: toDateInputValue(receipt.receivedAt),
      notes: receipt.notes ?? "",
      status: receipt.status,
    });
  }, [receipt]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const receivedAmountCents = Math.round(
        Number.parseFloat(form.receivedAmount) * 100,
      );
      return receiptsApi.update(receiptId, {
        receivedAmountCents,
        receivedAt: form.receivedAt
          ? new Date(form.receivedAt).toISOString()
          : undefined,
        notes: form.notes || undefined,
        status: form.status,
      });
    },
    onSuccess: () => {
      toast.success("Receipt updated");
      setFormError(null);
      qc.invalidateQueries({ queryKey: queryKeys.receipts.all });
      qc.invalidateQueries({ queryKey: queryKeys.receipts.detail(receiptId) });
    },
    onError: (error: Error) => {
      setFormError(error.message);
      toast.error(error.message);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => receiptsApi.archive(receiptId),
    onSuccess: () => {
      toast.success("Receipt archived");
      qc.invalidateQueries({ queryKey: queryKeys.receipts.all });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSave = () => {
    if (!receipt) {
      return;
    }

    const amount = Number.parseFloat(form.receivedAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setFormError("Received amount must be a valid non-negative number");
      return;
    }

    if (
      requiresLifecycleConfirmation("receipt", receipt.status, form.status) &&
      !window.confirm(
        getLifecycleConfirmationMessage("receipt", receipt.status, form.status),
      )
    ) {
      return;
    }

    setFormError(null);
    updateMutation.mutate();
  };

  const handleArchive = () => {
    if (!window.confirm("Archive this receipt?")) {
      return;
    }

    archiveMutation.mutate();
  };

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Receipt" description="Loading receipt details..." />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Receipt"
          description="The receipt was not found."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/receipts">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to receipts
              </Link>
            </Button>
          }
        />
        <EmptyState
          title="Receipt unavailable"
          description="Return to the receipts list and select another item."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={receipt.receiptNumber}
        description={`Receipt ID: ${receipt.id}`}
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/receipts">
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
            <StatusBadge status={receipt.status} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Received</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {formatDate(receipt.receivedAt)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Amount</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            ${centsToDollars(receipt.receivedAmountCents)}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Edit Receipt
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="receipt-amount">Received amount (USD)</Label>
            <Input
              id="receipt-amount"
              type="number"
              min="0"
              step="0.01"
              value={form.receivedAmount}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  receivedAmount: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="receipt-date">Received at</Label>
            <Input
              id="receipt-date"
              type="date"
              value={form.receivedAt}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  receivedAt: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="receipt-notes">Notes</Label>
            <Input
              id="receipt-notes"
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="receipt-status">Status</Label>
            <Select
              id="receipt-status"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as ReceiptStatus,
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
