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
  invoiceOverrideSchema,
  requiresLifecycleConfirmation,
} from "@/features/procurement/lib/procurement-forms";
import {
  type InvoiceStatus,
  invoicesApi,
} from "@/lib/api/modules/invoices-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface InvoiceDetailPageProps {
  invoiceId: string;
}

const STATUS_OPTIONS: InvoiceStatus[] = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "paid",
  "hold",
];

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

export function InvoiceDetailPage({ invoiceId }: InvoiceDetailPageProps) {
  const qc = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    vendorName: "",
    currency: "USD",
    totalAmount: "",
    dueDate: "",
    status: "draft" as InvoiceStatus,
    allowPayOverride: false,
    payOverrideReason: "",
  });

  const query = useQuery({
    queryKey: queryKeys.invoices.detail(invoiceId),
    queryFn: () => invoicesApi.get(invoiceId),
  });

  const invoice = query.data;

  useEffect(() => {
    if (!invoice) {
      return;
    }

    setForm((current) => ({
      ...current,
      vendorName: invoice.vendorName,
      currency: invoice.currency,
      totalAmount: centsToDollars(invoice.totalAmountCents),
      dueDate: toDateInputValue(invoice.dueDate),
      status: invoice.status,
      allowPayOverride: false,
      payOverrideReason: "",
    }));
  }, [invoice]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const totalAmountCents = Math.round(
        Number.parseFloat(form.totalAmount) * 100,
      );

      return invoicesApi.update(invoiceId, {
        vendorName: form.vendorName,
        currency: form.currency,
        totalAmountCents,
        dueDate: form.dueDate
          ? new Date(form.dueDate).toISOString()
          : undefined,
        status: form.status,
        allowPayOverride: form.allowPayOverride,
        payOverrideReason: form.allowPayOverride
          ? form.payOverrideReason.trim()
          : undefined,
      });
    },
    onSuccess: () => {
      toast.success("Invoice updated");
      setFormError(null);
      qc.invalidateQueries({ queryKey: queryKeys.invoices.all });
      qc.invalidateQueries({ queryKey: queryKeys.invoices.detail(invoiceId) });
    },
    onError: (error: Error) => {
      setFormError(error.message);
      toast.error(error.message);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => invoicesApi.archive(invoiceId),
    onSuccess: () => {
      toast.success("Invoice archived");
      qc.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSave = () => {
    if (!invoice) {
      return;
    }

    if (!form.vendorName.trim()) {
      setFormError("Vendor name is required");
      return;
    }

    const amount = Number.parseFloat(form.totalAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setFormError("Total amount must be a valid non-negative number");
      return;
    }

    const overrideCheck = invoiceOverrideSchema.safeParse({
      allowPayOverride: form.allowPayOverride,
      payOverrideReason: form.payOverrideReason,
    });

    if (!overrideCheck.success) {
      setFormError(
        overrideCheck.error.issues[0]?.message ?? "Invalid override reason",
      );
      return;
    }

    if (
      requiresLifecycleConfirmation("invoice", invoice.status, form.status) &&
      !window.confirm(
        getLifecycleConfirmationMessage("invoice", invoice.status, form.status),
      )
    ) {
      return;
    }

    setFormError(null);
    updateMutation.mutate();
  };

  const handleArchive = () => {
    if (!window.confirm("Archive this invoice?")) {
      return;
    }

    archiveMutation.mutate();
  };

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Invoice" description="Loading invoice details..." />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Invoice"
          description="The invoice was not found."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/invoices">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to invoices
              </Link>
            </Button>
          }
        />
        <EmptyState
          title="Invoice unavailable"
          description="Return to the invoice list and select another item."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.invoiceNumber}
        description={`Invoice ID: ${invoice.id}`}
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/invoices">
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
            <StatusBadge status={invoice.status} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Due date</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {formatDate(invoice.dueDate)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Amount</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            ${centsToDollars(invoice.totalAmountCents)}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Edit Invoice
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="invoice-vendor">Vendor name</Label>
            <Input
              id="invoice-vendor"
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
            <Label htmlFor="invoice-currency">Currency</Label>
            <Input
              id="invoice-currency"
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
            <Label htmlFor="invoice-amount">Total amount (USD)</Label>
            <Input
              id="invoice-amount"
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
            <Label htmlFor="invoice-due-date">Due date</Label>
            <Input
              id="invoice-due-date"
              type="date"
              value={form.dueDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  dueDate: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="invoice-status">Status</Label>
            <Select
              id="invoice-status"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as InvoiceStatus,
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
          <div className="space-y-2 md:col-span-2">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.allowPayOverride}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    allowPayOverride: event.target.checked,
                  }))
                }
              />
              Allow pay override
            </label>
            {form.allowPayOverride && (
              <div className="space-y-1.5">
                <Label htmlFor="invoice-override-reason">Override reason</Label>
                <Input
                  id="invoice-override-reason"
                  value={form.payOverrideReason}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      payOverrideReason: event.target.value,
                    }))
                  }
                  placeholder="Explain why payment override is required"
                />
                <p className="text-xs text-muted-foreground">
                  Required when override is enabled (8 to 1000 characters).
                </p>
              </div>
            )}
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
