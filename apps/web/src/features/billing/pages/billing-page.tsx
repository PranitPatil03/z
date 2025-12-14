"use client";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useActiveOrgRole } from "@/features/auth/hooks/use-active-org-role";
import {
  type BillingRecord,
  type BillingRecordStatus,
  type StripeWebhookEvent,
  type StripeWebhookProcessingStatus,
  type SubscriptionPlanKey,
  billingApi,
} from "@/lib/api/modules/billing-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const BILLING_RECORD_STATUSES: BillingRecordStatus[] = [
  "draft",
  "issued",
  "paid",
  "void",
];

const WEBHOOK_STATUSES: StripeWebhookProcessingStatus[] = [
  "processing",
  "processed",
  "failed",
];

function formatCents(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
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

function toIsoOrUndefined(value: string) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const timestamp = new Date(trimmed).getTime();
  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return new Date(trimmed).toISOString();
}

function parseOptionalJson(input: string) {
  const value = input.trim();
  if (value.length === 0) {
    return undefined;
  }

  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Metadata must be a JSON object");
  }

  return parsed as Record<string, unknown>;
}

export function BillingPage() {
  const queryClient = useQueryClient();
  const roleQuery = useActiveOrgRole();
  const canManageBilling =
    roleQuery.data === "owner" || roleQuery.data === "admin";

  const [selectedBillingRecordId, setSelectedBillingRecordId] = useState("");
  const [webhookStatusFilter, setWebhookStatusFilter] = useState<
    StripeWebhookProcessingStatus | ""
  >("failed");
  const [webhookLimit, setWebhookLimit] = useState("20");
  const [billingActionStatus, setBillingActionStatus] = useState<string | null>(
    null,
  );

  const [createForm, setCreateForm] = useState({
    projectId: "",
    reference: "",
    amountCents: "",
    currency: "USD",
    dueDate: "",
    metadataText: "",
  });

  const [updateForm, setUpdateForm] = useState({
    projectId: "",
    reference: "",
    amountCents: "",
    currency: "USD",
    status: "draft" as BillingRecordStatus,
    dueDate: "",
    paidAt: "",
    metadataText: "",
  });

  const [planForm, setPlanForm] = useState({
    plan: "starter" as SubscriptionPlanKey,
    reason: "",
  });

  const [paymentIntentForm, setPaymentIntentForm] = useState({
    billingRecordId: "",
    stripeCustomerId: "",
  });

  const [subscriptionForm, setSubscriptionForm] = useState({
    billingRecordId: "",
    stripeCustomerId: "",
    priceId: "",
  });

  const billingRecordsQuery = useQuery<BillingRecord[]>({
    queryKey: queryKeys.billing.list(),
    queryFn: () => billingApi.list(),
  });

  const usageQuery = useQuery({
    queryKey: queryKeys.billing.usage(),
    queryFn: billingApi.getUsageSummary,
  });

  const plansQuery = useQuery({
    queryKey: queryKeys.billing.plans(),
    queryFn: billingApi.listPlans,
  });

  const webhookEventsQuery = useQuery({
    queryKey: queryKeys.billing.webhookEvents({
      status: webhookStatusFilter || undefined,
      limit: Number.parseInt(webhookLimit, 10) || 20,
    }),
    queryFn: () =>
      billingApi.listWebhookEvents({
        status: webhookStatusFilter || undefined,
        limit: Number.parseInt(webhookLimit, 10) || 20,
      }),
    enabled: canManageBilling,
  });

  useEffect(() => {
    const firstId = billingRecordsQuery.data?.[0]?.id;
    if (!firstId) {
      setSelectedBillingRecordId("");
      return;
    }

    const selectedExists = (billingRecordsQuery.data ?? []).some(
      (record) => record.id === selectedBillingRecordId,
    );

    if (!selectedExists) {
      setSelectedBillingRecordId(firstId);
    }
  }, [billingRecordsQuery.data, selectedBillingRecordId]);

  const selectedRecord = useMemo(
    () =>
      (billingRecordsQuery.data ?? []).find(
        (record) => record.id === selectedBillingRecordId,
      ) ?? null,
    [billingRecordsQuery.data, selectedBillingRecordId],
  );

  useEffect(() => {
    if (!selectedRecord) {
      return;
    }

    setUpdateForm({
      projectId: selectedRecord.projectId ?? "",
      reference: selectedRecord.reference,
      amountCents: String(selectedRecord.amountCents),
      currency: selectedRecord.currency,
      status: selectedRecord.status,
      dueDate: selectedRecord.dueDate
        ? selectedRecord.dueDate.slice(0, 16)
        : "",
      paidAt: selectedRecord.paidAt ? selectedRecord.paidAt.slice(0, 16) : "",
      metadataText: selectedRecord.metadata
        ? JSON.stringify(selectedRecord.metadata, null, 2)
        : "",
    });

    setPaymentIntentForm((current) => ({
      ...current,
      billingRecordId: selectedRecord.id,
    }));

    setSubscriptionForm((current) => ({
      ...current,
      billingRecordId: selectedRecord.id,
    }));
  }, [selectedRecord]);

  useEffect(() => {
    if (usageQuery.data) {
      setPlanForm((current) => ({
        ...current,
        plan: usageQuery.data.plan,
      }));
    }
  }, [usageQuery.data]);

  const createBillingRecordMutation = useMutation({
    mutationFn: () => {
      const reference = createForm.reference.trim();
      const amountCents = Number.parseInt(createForm.amountCents, 10);

      if (!reference) {
        throw new Error("Reference is required");
      }

      if (!Number.isInteger(amountCents) || amountCents < 0) {
        throw new Error("Amount cents must be a non-negative integer");
      }

      return billingApi.create({
        projectId: createForm.projectId.trim() || undefined,
        reference,
        amountCents,
        currency: createForm.currency.trim().toUpperCase(),
        dueDate: toIsoOrUndefined(createForm.dueDate),
        metadata: parseOptionalJson(createForm.metadataText),
      });
    },
    onSuccess: (record) => {
      toast.success("Billing record created");
      setBillingActionStatus(`Created billing record ${record.reference}.`);
      setCreateForm({
        projectId: "",
        reference: "",
        amountCents: "",
        currency: "USD",
        dueDate: "",
        metadataText: "",
      });
      setSelectedBillingRecordId(record.id);
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setBillingActionStatus(error.message);
    },
  });

  const updateBillingRecordMutation = useMutation({
    mutationFn: () => {
      if (!selectedBillingRecordId) {
        throw new Error("Select a billing record first");
      }

      const amountCents = Number.parseInt(updateForm.amountCents, 10);
      if (!Number.isInteger(amountCents) || amountCents < 0) {
        throw new Error("Amount cents must be a non-negative integer");
      }

      return billingApi.update(selectedBillingRecordId, {
        projectId: updateForm.projectId.trim() || undefined,
        reference: updateForm.reference.trim(),
        amountCents,
        currency: updateForm.currency.trim().toUpperCase(),
        status: updateForm.status,
        dueDate: toIsoOrUndefined(updateForm.dueDate),
        paidAt: toIsoOrUndefined(updateForm.paidAt),
        metadata: parseOptionalJson(updateForm.metadataText),
      });
    },
    onSuccess: (record) => {
      toast.success("Billing record updated");
      setBillingActionStatus(`Updated billing record ${record.reference}.`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setBillingActionStatus(error.message);
    },
  });

  const archiveBillingRecordMutation = useMutation({
    mutationFn: (billingRecordId: string) =>
      billingApi.archive(billingRecordId),
    onSuccess: (record) => {
      toast.success("Billing record archived");
      setBillingActionStatus(`Archived billing record ${record.reference}.`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setBillingActionStatus(error.message);
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: () =>
      billingApi.updateSubscriptionPlan({
        plan: planForm.plan,
        reason: planForm.reason.trim() || undefined,
      }),
    onSuccess: (result) => {
      toast.success("Subscription plan updated");
      setBillingActionStatus(
        `Plan changed from ${result.previousPlan} to ${result.subscription.plan}.`,
      );
      setPlanForm((current) => ({ ...current, reason: "" }));
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setBillingActionStatus(error.message);
    },
  });

  const createPaymentIntentMutation = useMutation({
    mutationFn: () => {
      const billingRecordId = paymentIntentForm.billingRecordId.trim();
      const stripeCustomerId = paymentIntentForm.stripeCustomerId.trim();

      if (!billingRecordId || !stripeCustomerId) {
        throw new Error(
          "Billing record ID and Stripe customer ID are required",
        );
      }

      return billingApi.createPaymentIntent({
        billingRecordId,
        stripeCustomerId,
      });
    },
    onSuccess: (result) => {
      toast.success("Payment intent created");
      setBillingActionStatus(
        `Payment intent ${result.paymentIntentId} created successfully.`,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setBillingActionStatus(error.message);
    },
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: () => {
      const billingRecordId = subscriptionForm.billingRecordId.trim();
      const stripeCustomerId = subscriptionForm.stripeCustomerId.trim();
      const priceId = subscriptionForm.priceId.trim();

      if (!billingRecordId || !stripeCustomerId || !priceId) {
        throw new Error(
          "Billing record ID, Stripe customer ID, and Stripe price ID are required",
        );
      }

      return billingApi.createSubscription({
        billingRecordId,
        stripeCustomerId,
        priceId,
      });
    },
    onSuccess: (result) => {
      toast.success("Stripe subscription created");
      setBillingActionStatus(
        `Subscription ${result.subscriptionId} created (${result.status}).`,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setBillingActionStatus(error.message);
    },
  });

  const retryWebhookEventMutation = useMutation({
    mutationFn: (eventId: string) => billingApi.retryWebhookEvent(eventId),
    onSuccess: (result) => {
      toast.success("Webhook retry requested");
      setBillingActionStatus(`Retry requested for event ${result.eventId}.`);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.billing.webhookEvents({
          status: webhookStatusFilter || undefined,
          limit: Number.parseInt(webhookLimit, 10) || 20,
        }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setBillingActionStatus(error.message);
    },
  });

  const columns: DataTableColumn<BillingRecord>[] = [
    {
      key: "reference",
      header: "Reference",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.reference}</p>
          <p className="text-xs text-muted-foreground">
            {row.projectId ?? "Org-wide"}
          </p>
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
      width: "150px",
      render: (row) => (
        <span className="font-medium">{formatCents(row.amountCents)}</span>
      ),
    },
    {
      key: "timing",
      header: "Due / Paid",
      width: "220px",
      render: (row) => (
        <div>
          <p className="text-xs text-muted-foreground">
            Due {formatDateTime(row.dueDate)}
          </p>
          <p className="text-xs text-muted-foreground">
            Paid {formatDateTime(row.paidAt)}
          </p>
        </div>
      ),
    },
    {
      key: "stripe",
      header: "Stripe",
      width: "220px",
      render: (row) => (
        <div>
          <p className="truncate font-mono text-xs text-muted-foreground">
            PI: {row.stripePaymentIntentId ?? "-"}
          </p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            Sub: {row.subscriptionId ?? "-"}
          </p>
        </div>
      ),
    },
  ];

  const webhookColumns: DataTableColumn<StripeWebhookEvent>[] = [
    {
      key: "eventType",
      header: "Event",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.eventType}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {row.stripeEventId}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "160px",
      render: (row) => <StatusBadge status={row.processingStatus} />,
    },
    {
      key: "error",
      header: "Error",
      width: "280px",
      render: (row) => (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {row.error || "-"}
        </p>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      width: "180px",
      render: (row) => (
        <p className="text-xs text-muted-foreground">
          {formatDateTime(row.createdAt)}
        </p>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "90px",
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(event) => {
            event.stopPropagation();
            retryWebhookEventMutation.mutate(row.id);
          }}
          disabled={
            retryWebhookEventMutation.isPending ||
            row.processingStatus === "processed"
          }
        >
          Retry
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Operate billing records, plans, Stripe actions, and webhook reliability."
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void billingRecordsQuery.refetch();
              void usageQuery.refetch();
              void plansQuery.refetch();
              if (canManageBilling) {
                void webhookEventsQuery.refetch();
              }
            }}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Plan"
          value={usageQuery.data?.plan ?? "-"}
          subtitle={usageQuery.data?.status ?? "Unknown"}
          icon={CreditCard}
          isLoading={usageQuery.isLoading}
        />
        <StatCard
          title="Credits Included"
          value={usageQuery.data?.aiCreditsIncluded ?? "-"}
          subtitle={`Cycle ends ${formatDateTime(usageQuery.data?.cycleEndAt)}`}
          isLoading={usageQuery.isLoading}
        />
        <StatCard
          title="Credits Used"
          value={usageQuery.data?.aiCreditsUsed ?? "-"}
          subtitle={`Remaining ${usageQuery.data?.remainingCredits ?? "-"}`}
          isLoading={usageQuery.isLoading}
        />
        <StatCard
          title="Overage"
          value={
            usageQuery.data?.allowOverage
              ? formatCents(usageQuery.data.overagePriceCents)
              : "Disabled"
          }
          subtitle="Per credit"
          isLoading={usageQuery.isLoading}
        />
      </section>

      {billingActionStatus && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          {billingActionStatus}
        </div>
      )}

      {!canManageBilling && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Billing management actions require owner/admin role. You can still
          view records and usage summary.
        </div>
      )}

      <DataTable
        columns={columns}
        data={billingRecordsQuery.data ?? []}
        isLoading={billingRecordsQuery.isLoading}
        rowKey={(r) => r.id}
        onRowClick={(row) => setSelectedBillingRecordId(row.id)}
        emptyState={
          <EmptyState
            icon={CreditCard}
            title="No billing records"
            description="Create billing records to begin billing and payment workflows."
          />
        }
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Create billing record
          </h2>
          <div className="mt-3 grid gap-3">
            <Input
              placeholder="Reference"
              value={createForm.reference}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  reference: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Project ID (optional)"
              value={createForm.projectId}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  projectId: event.target.value,
                }))
              }
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Amount cents"
                inputMode="numeric"
                value={createForm.amountCents}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    amountCents: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Currency (USD)"
                value={createForm.currency}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    currency: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="billing-create-due-date">Due date</Label>
              <Input
                id="billing-create-due-date"
                type="datetime-local"
                value={createForm.dueDate}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    dueDate: event.target.value,
                  }))
                }
              />
            </div>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
              placeholder="Metadata JSON (optional)"
              value={createForm.metadataText}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  metadataText: event.target.value,
                }))
              }
            />
            <div className="flex justify-end">
              <Button
                onClick={() => createBillingRecordMutation.mutate()}
                disabled={
                  !canManageBilling || createBillingRecordMutation.isPending
                }
              >
                Create record
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Update selected record
          </h2>
          {!selectedRecord ? (
            <EmptyState
              title="No record selected"
              description="Select a billing record from the table to edit detail fields."
              className="border-none"
            />
          ) : (
            <div className="mt-3 grid gap-3">
              <p className="text-xs text-muted-foreground">
                {selectedRecord.id}
              </p>
              <Input
                placeholder="Reference"
                value={updateForm.reference}
                onChange={(event) =>
                  setUpdateForm((current) => ({
                    ...current,
                    reference: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Project ID (optional)"
                value={updateForm.projectId}
                onChange={(event) =>
                  setUpdateForm((current) => ({
                    ...current,
                    projectId: event.target.value,
                  }))
                }
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Amount cents"
                  inputMode="numeric"
                  value={updateForm.amountCents}
                  onChange={(event) =>
                    setUpdateForm((current) => ({
                      ...current,
                      amountCents: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Currency"
                  value={updateForm.currency}
                  onChange={(event) =>
                    setUpdateForm((current) => ({
                      ...current,
                      currency: event.target.value,
                    }))
                  }
                />
              </div>
              <Select
                value={updateForm.status}
                onChange={(event) =>
                  setUpdateForm((current) => ({
                    ...current,
                    status: event.target.value as BillingRecordStatus,
                  }))
                }
              >
                {BILLING_RECORD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="billing-update-due-date">Due date</Label>
                  <Input
                    id="billing-update-due-date"
                    type="datetime-local"
                    value={updateForm.dueDate}
                    onChange={(event) =>
                      setUpdateForm((current) => ({
                        ...current,
                        dueDate: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="billing-update-paid-at">Paid at</Label>
                  <Input
                    id="billing-update-paid-at"
                    type="datetime-local"
                    value={updateForm.paidAt}
                    onChange={(event) =>
                      setUpdateForm((current) => ({
                        ...current,
                        paidAt: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                placeholder="Metadata JSON (optional)"
                value={updateForm.metadataText}
                onChange={(event) =>
                  setUpdateForm((current) => ({
                    ...current,
                    metadataText: event.target.value,
                  }))
                }
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => {
                    if (window.confirm("Archive this billing record?")) {
                      archiveBillingRecordMutation.mutate(selectedRecord.id);
                    }
                  }}
                  disabled={
                    !canManageBilling || archiveBillingRecordMutation.isPending
                  }
                >
                  Archive
                </Button>
                <Button
                  onClick={() => updateBillingRecordMutation.mutate()}
                  disabled={
                    !canManageBilling || updateBillingRecordMutation.isPending
                  }
                >
                  Save changes
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Subscription plans
          </h2>
          <div className="mt-3 space-y-2">
            {(plansQuery.data ?? []).map((plan) => (
              <div
                key={plan.plan}
                className="rounded-lg border border-border p-3"
              >
                <p className="text-sm font-medium text-foreground">
                  {plan.plan}
                </p>
                <p className="text-xs text-muted-foreground">
                  Credits {plan.aiCreditsIncluded} · Overage{" "}
                  {plan.allowOverage
                    ? formatCents(plan.overagePriceCents)
                    : "disabled"}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-3">
            <Select
              value={planForm.plan}
              onChange={(event) =>
                setPlanForm((current) => ({
                  ...current,
                  plan: event.target.value as SubscriptionPlanKey,
                }))
              }
            >
              <option value="starter">starter</option>
              <option value="growth">growth</option>
              <option value="enterprise">enterprise</option>
            </Select>
            <Input
              placeholder="Reason (optional)"
              value={planForm.reason}
              onChange={(event) =>
                setPlanForm((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
            />
            <Button
              onClick={() => changePlanMutation.mutate()}
              disabled={!canManageBilling || changePlanMutation.isPending}
            >
              Update plan
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Stripe payment intent
          </h2>
          <div className="mt-3 grid gap-3">
            <Input
              placeholder="Billing record ID"
              value={paymentIntentForm.billingRecordId}
              onChange={(event) =>
                setPaymentIntentForm((current) => ({
                  ...current,
                  billingRecordId: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Stripe customer ID"
              value={paymentIntentForm.stripeCustomerId}
              onChange={(event) =>
                setPaymentIntentForm((current) => ({
                  ...current,
                  stripeCustomerId: event.target.value,
                }))
              }
            />
            <Button
              onClick={() => createPaymentIntentMutation.mutate()}
              disabled={
                !canManageBilling || createPaymentIntentMutation.isPending
              }
            >
              Create payment intent
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Stripe subscription
          </h2>
          <div className="mt-3 grid gap-3">
            <Input
              placeholder="Billing record ID"
              value={subscriptionForm.billingRecordId}
              onChange={(event) =>
                setSubscriptionForm((current) => ({
                  ...current,
                  billingRecordId: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Stripe customer ID"
              value={subscriptionForm.stripeCustomerId}
              onChange={(event) =>
                setSubscriptionForm((current) => ({
                  ...current,
                  stripeCustomerId: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Stripe price ID"
              value={subscriptionForm.priceId}
              onChange={(event) =>
                setSubscriptionForm((current) => ({
                  ...current,
                  priceId: event.target.value,
                }))
              }
            />
            <Button
              onClick={() => createSubscriptionMutation.mutate()}
              disabled={
                !canManageBilling || createSubscriptionMutation.isPending
              }
            >
              Create subscription
            </Button>
          </div>
        </div>
      </section>

      {canManageBilling && (
        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="webhook-status-filter">Webhook status</Label>
              <Select
                id="webhook-status-filter"
                value={webhookStatusFilter}
                onChange={(event) =>
                  setWebhookStatusFilter(
                    event.target.value as StripeWebhookProcessingStatus | "",
                  )
                }
              >
                <option value="">all</option>
                {WEBHOOK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="webhook-limit">Limit</Label>
              <Input
                id="webhook-limit"
                inputMode="numeric"
                value={webhookLimit}
                onChange={(event) => setWebhookLimit(event.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => webhookEventsQuery.refetch()}
              disabled={webhookEventsQuery.isFetching}
            >
              Refresh webhooks
            </Button>
          </div>
          <DataTable
            columns={webhookColumns}
            data={webhookEventsQuery.data?.items ?? []}
            isLoading={webhookEventsQuery.isLoading}
            rowKey={(row) => row.id}
            emptyState={
              <EmptyState
                title="No webhook events"
                description="Stripe webhook processing history appears here."
                className="border-none"
              />
            }
          />
        </section>
      )}
    </div>
  );
}
