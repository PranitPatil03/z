"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { useActiveOrgRole } from "@/features/auth/hooks/use-active-org-role";
import {
  buildChangeOrderTimeline,
  canDecide,
  canSubmitForApproval,
  getDecisionHistory,
  getSlaIndicator,
} from "@/features/change-orders/lib/change-order-utils";
import {
  type ChangeOrder,
  changeOrdersApi,
} from "@/lib/api/modules/change-orders-api";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Clock3,
  Loader2,
  Paperclip,
  Send,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface ChangeOrderDetailPageProps {
  changeOrderId: string;
}

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function toDateInputValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 16);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isDraftEditable(order: ChangeOrder) {
  return order.status === "draft" || order.status === "revision_requested";
}

export function ChangeOrderDetailPage({
  changeOrderId,
}: ChangeOrderDetailPageProps) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [attachmentId, setAttachmentId] = useState("");
  const [decisionComment, setDecisionComment] = useState("");
  const [decisionStatus, setDecisionStatus] = useState<
    "approved" | "rejected" | "revision_requested" | "closed"
  >("approved");
  const [form, setForm] = useState({
    title: "",
    reason: "",
    impactCost: "0",
    impactDays: "0",
    deadlineAt: "",
    approvalStages: "",
  });

  const roleQuery = useActiveOrgRole();
  const canApprove = roleQuery.data === "owner" || roleQuery.data === "admin";

  const detailQuery = useQuery({
    queryKey: queryKeys.changeOrders.detail(changeOrderId),
    queryFn: () => changeOrdersApi.get(changeOrderId),
  });

  const attachmentsQuery = useQuery({
    queryKey: queryKeys.changeOrders.attachments(changeOrderId),
    queryFn: () => changeOrdersApi.listAttachments(changeOrderId),
    enabled: detailQuery.data !== undefined,
  });

  const order = detailQuery.data;

  useEffect(() => {
    if (!order) {
      return;
    }

    setForm({
      title: order.title,
      reason: order.reason,
      impactCost: (order.impactCostCents / 100).toFixed(2),
      impactDays: String(order.impactDays),
      deadlineAt: toDateInputValue(order.deadlineAt),
      approvalStages:
        order.metadata?.routingPolicy?.approvalStages?.join(", ") ?? "",
    });
  }, [order]);

  const saveDraftMutation = useMutation({
    mutationFn: () => {
      if (!order) {
        throw new Error("Change order not found");
      }

      return changeOrdersApi.update(order.id, {
        title: form.title.trim(),
        reason: form.reason.trim(),
        impactCostCents: Math.round(Number.parseFloat(form.impactCost) * 100),
        impactDays: Number.parseInt(form.impactDays, 10) || 0,
        deadlineAt: form.deadlineAt
          ? new Date(form.deadlineAt).toISOString()
          : undefined,
        routingPolicy:
          form.approvalStages.trim().length > 0
            ? {
                approvalStages: form.approvalStages
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean),
              }
            : undefined,
      });
    },
    onSuccess: () => {
      toast.success("Change order updated");
      setFormError(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.changeOrders.all,
      });
    },
    onError: (error: Error) => {
      setFormError(error.message);
      toast.error(error.message);
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => changeOrdersApi.submit(changeOrderId),
    onSuccess: () => {
      toast.success("Change order submitted");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.changeOrders.all,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const decideMutation = useMutation({
    mutationFn: () =>
      changeOrdersApi.decide(changeOrderId, {
        status: decisionStatus,
        comment: decisionComment.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Decision recorded");
      setDecisionComment("");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.changeOrders.all,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const attachMutation = useMutation({
    mutationFn: () =>
      changeOrdersApi.attachFileAsset(changeOrderId, attachmentId.trim()),
    onSuccess: () => {
      toast.success("Attachment linked");
      setAttachmentId("");
      void attachmentsQuery.refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const detachMutation = useMutation({
    mutationFn: (fileAssetId: string) =>
      changeOrdersApi.detachFileAsset(changeOrderId, fileAssetId),
    onSuccess: () => {
      toast.success("Attachment removed");
      void attachmentsQuery.refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const timeline = useMemo(() => {
    if (!order) {
      return [];
    }
    return buildChangeOrderTimeline(order);
  }, [order]);

  const history = useMemo(() => {
    if (!order) {
      return [];
    }
    return getDecisionHistory(order);
  }, [order]);

  const sla = order ? getSlaIndicator(order.deadlineAt) : getSlaIndicator(null);

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Change Order"
          description="Loading change order..."
        />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Change Order"
          description="The requested change order was not found."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/change-orders">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to list
              </Link>
            </Button>
          }
        />
        <EmptyState
          icon={AlertTriangle}
          title="Change order unavailable"
          description="Return to the change order list and select another item."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.title}
        description={`Change order ${order.id}`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/change-orders">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-2">
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {order.pipelineStage}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Impact cost</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {formatCents(order.impactCostCents)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Impact days</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {order.impactDays}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">SLA deadline</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {formatDateTime(order.deadlineAt)}
          </p>
          <p
            className={cn(
              "mt-1 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
              sla.state === "overdue" &&
                "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
              sla.state === "warning" &&
                "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
              sla.state === "ok" &&
                "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
              sla.state === "none" &&
                "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400",
            )}
          >
            <Clock3 className="mr-1 h-3 w-3" />
            {sla.label}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Draft details
        </h2>
        {!isDraftEditable(order) && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            Editing is limited to draft and revision-requested stages.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              disabled={!isDraftEditable(order)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Reason</Label>
            <Input
              value={form.reason}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
              disabled={!isDraftEditable(order)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Impact cost (USD)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.impactCost}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  impactCost: event.target.value,
                }))
              }
              disabled={!isDraftEditable(order)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Impact days</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={form.impactDays}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  impactDays: event.target.value,
                }))
              }
              disabled={!isDraftEditable(order)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Deadline</Label>
            <Input
              type="datetime-local"
              value={form.deadlineAt}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  deadlineAt: event.target.value,
                }))
              }
              disabled={!isDraftEditable(order)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Approval stages</Label>
            <Input
              value={form.approvalStages}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  approvalStages: event.target.value,
                }))
              }
              placeholder="pm_review, finance_review"
              disabled={!isDraftEditable(order)}
            />
          </div>
        </div>

        {formError && (
          <p className="mt-3 text-xs text-destructive">{formError}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {canSubmitForApproval(order.status) && (
            <Button
              variant="outline"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Send className="mr-1.5 h-4 w-4" />
              Submit for approval
            </Button>
          )}
          <Button
            onClick={() => saveDraftMutation.mutate()}
            disabled={saveDraftMutation.isPending || !isDraftEditable(order)}
          >
            {saveDraftMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save draft
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-base font-semibold text-foreground">
          Decision controls
        </h2>
        {!canApprove && (
          <p className="mb-3 text-xs text-muted-foreground">
            Only organization owner/admin can approve or reject.
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            value={order.pipelineStage}
            readOnly
            className="md:col-span-1"
          />
          <select
            value={decisionStatus}
            onChange={(event) =>
              setDecisionStatus(
                event.target.value as
                  | "approved"
                  | "rejected"
                  | "revision_requested"
                  | "closed",
              )
            }
            className="h-10 rounded-md border border-input bg-card px-3 py-2 text-sm md:col-span-1"
            disabled={!canApprove || !canDecide(order.status)}
          >
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="revision_requested">revision_requested</option>
            <option value="closed">closed</option>
          </select>
          <Button
            onClick={() => decideMutation.mutate()}
            disabled={
              !canApprove ||
              !canDecide(order.status) ||
              decideMutation.isPending
            }
            className="md:col-span-1"
          >
            {decideMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Apply decision
          </Button>
        </div>
        <div className="mt-3 space-y-1.5">
          <Label>Decision comment</Label>
          <Input
            value={decisionComment}
            onChange={(event) => setDecisionComment(event.target.value)}
            placeholder="Optional rationale"
            disabled={!canApprove || !canDecide(order.status)}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-base font-semibold text-foreground">
          Attachments
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Attach an uploaded file asset by ID. Use the storage upload flow to
          create file assets.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="file-asset-id"
            value={attachmentId}
            onChange={(event) => setAttachmentId(event.target.value)}
          />
          <Button
            variant="outline"
            onClick={() => attachMutation.mutate()}
            disabled={
              attachMutation.isPending || attachmentId.trim().length === 0
            }
          >
            {attachMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            <Paperclip className="mr-1.5 h-4 w-4" />
            Attach
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {(attachmentsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No attachments linked.
            </p>
          ) : (
            (attachmentsQuery.data ?? []).map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {asset.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {asset.id} • {asset.contentType} • {asset.status}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => detachMutation.mutate(asset.id)}
                  disabled={detachMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-base font-semibold text-foreground">
            Status timeline
          </h2>
          <div className="space-y-2">
            {timeline.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-border px-3 py-2"
              >
                <p className="text-sm font-medium text-foreground">
                  {event.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(event.at)}
                </p>
                {event.detail && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.detail}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-base font-semibold text-foreground">
            Decision history
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No decision entries yet.
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => (
                <div
                  key={`${entry.stage}-${entry.at}`}
                  className="rounded-lg border border-border px-3 py-2"
                >
                  <p className="text-sm font-medium text-foreground">
                    {entry.stage} • {entry.decision}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(entry.at)} by {entry.actorUserId}
                  </p>
                  {entry.comment && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
