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
import { type RfqStatus, rfqsApi } from "@/lib/api/modules/rfqs-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const STATUS_OPTIONS: RfqStatus[] = ["draft", "sent", "closed", "canceled"];

interface RfqDetailPageProps {
  rfqId: string;
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
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

export function RfqDetailPage({ rfqId }: RfqDetailPageProps) {
  const qc = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    scope: "",
    dueDate: "",
    status: "draft" as RfqStatus,
  });

  const query = useQuery({
    queryKey: queryKeys.rfqs.detail(rfqId),
    queryFn: () => rfqsApi.get(rfqId),
  });

  const rfq = query.data;

  useEffect(() => {
    if (!rfq) {
      return;
    }

    setForm({
      title: rfq.title,
      scope: rfq.scope,
      dueDate: toDateInputValue(rfq.dueDate),
      status: rfq.status,
    });
  }, [rfq]);

  const updateMutation = useMutation({
    mutationFn: () =>
      rfqsApi.update(rfqId, {
        title: form.title,
        scope: form.scope,
        dueDate: form.dueDate
          ? new Date(form.dueDate).toISOString()
          : undefined,
        status: form.status,
      }),
    onSuccess: () => {
      toast.success("RFQ updated");
      setFormError(null);
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.all });
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.detail(rfqId) });
    },
    onError: (error: Error) => {
      setFormError(error.message);
      toast.error(error.message);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => rfqsApi.archive(rfqId),
    onSuccess: () => {
      toast.success("RFQ archived");
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    if (!rfq) {
      return;
    }

    if (!form.title.trim() || !form.scope.trim()) {
      setFormError("Title and scope are required");
      return;
    }

    if (
      requiresLifecycleConfirmation("rfq", rfq.status, form.status) &&
      !window.confirm(
        getLifecycleConfirmationMessage("rfq", rfq.status, form.status),
      )
    ) {
      return;
    }

    setFormError(null);
    updateMutation.mutate();
  };

  const handleArchive = () => {
    if (!window.confirm("Archive this RFQ?")) {
      return;
    }

    archiveMutation.mutate();
  };

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="RFQ" description="Loading RFQ details..." />
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="RFQ"
          description="The RFQ was not found or no longer available."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/rfqs">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to RFQs
              </Link>
            </Button>
          }
        />
        <EmptyState
          title="RFQ unavailable"
          description="Try returning to the RFQ list and selecting another item."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={rfq.title}
        description={`RFQ ID: ${rfq.id}`}
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/rfqs">
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
            <StatusBadge status={rfq.status} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Created</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {formatDate(rfq.createdAt)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Due Date</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {formatDate(rfq.dueDate)}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Edit RFQ
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="rfq-title">Title</Label>
            <Input
              id="rfq-title"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="rfq-scope">Scope</Label>
            <Input
              id="rfq-scope"
              value={form.scope}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  scope: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rfq-due-date">Due date</Label>
            <Input
              id="rfq-due-date"
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
          <div className="space-y-1.5">
            <Label htmlFor="rfq-status">Status</Label>
            <Select
              id="rfq-status"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as RfqStatus,
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
