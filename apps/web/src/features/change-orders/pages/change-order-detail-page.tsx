"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-radix";
import { StatCard } from "@/components/ui/stat-card";
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
import { storageApi } from "@/lib/api/modules/storage-api";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  ChevronRight,
  Clock3,
  DollarSign,
  FolderKanban,
  GitBranch,
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

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTokenLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getDecisionTone(decision: string) {
  switch (decision) {
    case "approved":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "rejected":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "revision_requested":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300";
  }
}

function isDraftEditable(order: ChangeOrder) {
  return order.status === "draft" || order.status === "revision_requested";
}

export function ChangeOrderDetailPage({
  changeOrderId,
}: ChangeOrderDetailPageProps) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recentUploads, setRecentUploads] = useState<
    Array<{
      fileAssetId: string;
      fileName: string;
    }>
  >([]);
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

  const uploadAttachmentMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!order) {
        throw new Error("Change order is not loaded");
      }

      const session = await storageApi.createUploadSession({
        projectId: order.projectId,
        entityType: "change_order_attachment",
        entityId: changeOrderId,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      const uploadResult = await storageApi.uploadToSignedUrl(
        session.uploadUrl,
        file,
        session.requiredHeaders,
      );

      await storageApi.completeUpload(session.fileAssetId, {
        eTag: uploadResult.eTag,
      });

      await changeOrdersApi.attachFileAsset(changeOrderId, session.fileAssetId);

      return {
        fileAssetId: session.fileAssetId,
        fileName: file.name,
      };
    },
    onSuccess: (asset) => {
      setRecentUploads((current) => [asset, ...current]);
      setUploadError(null);
      toast.success(`Uploaded and attached ${asset.fileName}`);
      void attachmentsQuery.refetch();
    },
    onError: (error: Error) => {
      setUploadError(error.message);
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

  async function handleAttachmentUploads(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    for (const file of Array.from(files)) {
      await uploadAttachmentMutation.mutateAsync(file);
    }
  }

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

  const historyRows = useMemo(() => [...history].reverse(), [history]);

  const attachments = attachmentsQuery.data ?? [];

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
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/change-orders" className="hover:text-foreground transition-colors">
          Change Orders
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate font-medium text-foreground">{order.id}</span>
      </nav>

      <PageHeader
        title={order.title}
        description={`Project ${order.projectId} • Change order ${order.id}`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-muted-foreground">Project</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 break-all font-mono text-sm font-semibold text-foreground">
            {order.projectId}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Linked project scope</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <GitBranch className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Stage: {order.pipelineStage}</p>
        </div>

        <StatCard
          title="Impact Cost"
          value={formatCents(order.impactCostCents)}
          subtitle="Budget impact"
          icon={DollarSign}
        />

        <StatCard
          title="Impact Days"
          value={order.impactDays}
          subtitle="Schedule shift"
          icon={CalendarClock}
        />

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">SLA Deadline</p>
          <p className="mt-2 text-sm font-medium text-foreground">
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
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

          {formError && <p className="mt-3 text-xs text-destructive">{formError}</p>}

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

        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Decision controls
            </h2>
            {!canApprove && (
              <p className="mb-3 text-xs text-muted-foreground">
                Only organization owner/admin can approve or reject.
              </p>
            )}
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Current stage</Label>
                <Input value={order.pipelineStage} readOnly />
              </div>
              <div className="space-y-1.5">
                <Label>Decision</Label>
                <Select
                  value={decisionStatus}
                  onValueChange={(value) =>
                    setDecisionStatus(
                      value as
                        | "approved"
                        | "rejected"
                        | "revision_requested"
                        | "closed",
                    )
                  }
                  disabled={!canApprove || !canDecide(order.status)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="revision_requested">
                      Revision requested
                    </SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Decision comment</Label>
                <Input
                  value={decisionComment}
                  onChange={(event) => setDecisionComment(event.target.value)}
                  placeholder="Optional rationale"
                  disabled={!canApprove || !canDecide(order.status)}
                />
              </div>
              <Button
                onClick={() => decideMutation.mutate()}
                disabled={
                  !canApprove ||
                  !canDecide(order.status) ||
                  decideMutation.isPending
                }
              >
                {decideMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Apply decision
              </Button>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">Attachments</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {attachments.length} linked
              </span>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Upload files and attach them directly to this change order.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setUploadError(null);
                  setRecentUploads([]);
                  setUploadModalOpen(true);
                }}
              >
                <Paperclip className="mr-1.5 h-4 w-4" />
                Upload and attach
              </Button>
              <p className="text-xs text-muted-foreground">
                Supports multiple files.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              {attachmentsQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading attachments...
                </div>
              ) : attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attachments linked.</p>
              ) : (
                attachments.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {asset.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {asset.contentType} • {formatBytes(asset.sizeBytes)} • {asset.status}
                      </p>
                      <p className="truncate font-mono text-xs text-muted-foreground/80">
                        {asset.id}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => detachMutation.mutate(asset.id)}
                      disabled={detachMutation.isPending}
                      aria-label="Remove attachment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-base font-semibold text-foreground">
            Status timeline
          </h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timeline events yet.</p>
          ) : (
            <ol className="space-y-0">
              {timeline.map((event, index) => (
                <li
                  key={event.id}
                  className={cn(
                    "relative pl-6",
                    index === timeline.length - 1 ? "pb-0" : "pb-5",
                  )}
                >
                  <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  {index !== timeline.length - 1 && (
                    <span className="absolute left-[4px] top-4 h-[calc(100%-6px)] w-px bg-border" />
                  )}
                  <p className="text-sm font-medium text-foreground">{event.label}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(event.at)}</p>
                  {event.detail && (
                    <p className="mt-1 text-xs text-muted-foreground">{event.detail}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-base font-semibold text-foreground">
            Decision history
          </h2>
          {historyRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No decision entries yet.</p>
          ) : (
            <div className="space-y-2">
              {historyRows.map((entry) => (
                <div
                  key={`${entry.stage}-${entry.at}`}
                  className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {formatTokenLabel(entry.stage)}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        getDecisionTone(entry.decision),
                      )}
                    >
                      {formatTokenLabel(entry.decision)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(entry.at)} by {entry.actorUserId}
                  </p>
                  {entry.comment && (
                    <p className="mt-1 text-xs text-muted-foreground">{entry.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <FormDrawer
        open={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          setUploadError(null);
        }}
        title="Upload attachments"
        description="Choose files to upload. Uploaded files are attached automatically."
        width="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUploadModalOpen(false);
                setUploadError(null);
              }}
            >
              Done
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Select files</Label>
            <Input
              type="file"
              multiple
              onChange={(event) => {
                void handleAttachmentUploads(event.target.files);
                event.currentTarget.value = "";
              }}
              disabled={uploadAttachmentMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Files are uploaded to storage and linked to this change order.
            </p>
          </div>

          {uploadAttachmentMutation.isPending && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading and attaching file...
            </p>
          )}

          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}

          {recentUploads.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="text-xs font-medium text-foreground">Recent uploads</p>
              <div className="space-y-1.5">
                {recentUploads.map((asset) => (
                  <div
                    key={asset.fileAssetId}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="truncate text-foreground">{asset.fileName}</span>
                    <span className="font-mono text-muted-foreground">
                      {asset.fileAssetId}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </FormDrawer>
    </div>
  );
}
