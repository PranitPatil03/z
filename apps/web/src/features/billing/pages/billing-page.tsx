"use client";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useActiveOrgRole } from "@/features/auth/hooks/use-active-org-role";
import {
  type BillingPlan,
  type BillingRecord,
  type PaidPlanKey,
  type StripeCheckoutPlanPricing,
  type SubscriptionPlanKey,
  billingApi,
} from "@/lib/api/modules/billing-api";
import { organizationsApi } from "@/lib/api/modules/organizations-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useSessionStore } from "@/store/session-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const PAID_PLAN_SET = new Set<SubscriptionPlanKey>(["growth", "enterprise"]);

type PaidBillingPlan = BillingPlan & { plan: PaidPlanKey };

function formatCents(value: number, currencyCode = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(value / 100);
  } catch {
    return `${(value / 100).toFixed(2)} ${currencyCode}`;
  }
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

function isPaidPlan(plan: SubscriptionPlanKey): plan is PaidPlanKey {
  return PAID_PLAN_SET.has(plan);
}

function formatCheckoutPrice(pricing?: StripeCheckoutPlanPricing | null) {
  if (!pricing || !pricing.available || pricing.amountCents == null) {
    return "Configured in Stripe";
  }

  return formatCents(pricing.amountCents, pricing.currency ?? "USD");
}

function formatCheckoutCadence(pricing?: StripeCheckoutPlanPricing | null) {
  if (!pricing || !pricing.available || !pricing.interval) {
    return "See Stripe checkout";
  }

  const intervalCount = pricing.intervalCount ?? 1;
  if (intervalCount === 1) {
    return `Billed ${pricing.interval}`;
  }

  return `Billed every ${intervalCount} ${pricing.interval}s`;
}

function PricingPlanCard({
  plan,
  pricing,
  selected,
  onSelect,
}: {
  plan: PaidBillingPlan;
  pricing?: StripeCheckoutPlanPricing;
  selected: boolean;
  onSelect: (plan: PaidPlanKey) => void;
}) {
  const smartMailLimit =
    plan.limits.smartmailAccounts == null
      ? "Unlimited"
      : `${plan.limits.smartmailAccounts} accounts`;

  return (
    <button
      type="button"
      onClick={() => onSelect(plan.plan)}
      className={`w-full rounded-xl border p-4 text-left transition ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <p className="text-sm font-semibold text-foreground capitalize">{plan.plan}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">
        {formatCheckoutPrice(pricing)}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatCheckoutCadence(pricing)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        AI credits included: {plan.aiCreditsIncluded.toLocaleString()}
      </p>
      <p className="text-xs text-muted-foreground">
        SmartMail accounts: {smartMailLimit}
      </p>
      <p className="text-xs text-muted-foreground">
        Overage: {plan.allowOverage ? formatCents(plan.overagePriceCents) : "Disabled"}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Features: {plan.enabledFeatures.join(", ") || "None"}
      </p>
      {pricing && !pricing.available && (
        <p className="mt-2 text-xs text-amber-600">
          Price ID is not configured yet for this plan.
        </p>
      )}
    </button>
  );
}

export function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const activeOrganizationId = useSessionStore(
    (state) => state.activeOrganizationId,
  );
  const setActiveOrganizationId = useSessionStore(
    (state) => state.setActiveOrganizationId,
  );

  const roleQuery = useActiveOrgRole();
  const canManageBilling =
    roleQuery.data === "owner" || roleQuery.data === "admin";

  const organizationsQuery = useQuery({
    queryKey: queryKeys.organizations.list(),
    queryFn: organizationsApi.list,
    staleTime: 60_000,
  });

  const organizations = organizationsQuery.data ?? [];
  const selectedOrganizationId =
    activeOrganizationId ?? organizations[0]?.id ?? "";

  const switchOrganizationMutation = useMutation({
    mutationFn: (organizationId: string) => organizationsApi.setActive(organizationId),
    onMutate: async (organizationId) => {
      const previousOrganizationId =
        useSessionStore.getState().activeOrganizationId;
      setActiveOrganizationId(organizationId);
      return { previousOrganizationId };
    },
    onError: (error: Error, _organizationId, context) => {
      setActiveOrganizationId(context?.previousOrganizationId ?? null);
      toast.error(error.message);
    },
    onSuccess: (_response, organizationId) => {
      setActiveOrganizationId(organizationId);
      void queryClient.invalidateQueries();
      router.refresh();
      toast.success("Organization switched");
    },
  });

  const usageQuery = useQuery({
    queryKey: queryKeys.billing.usage(),
    queryFn: billingApi.getUsageSummary,
    enabled: Boolean(activeOrganizationId),
  });

  const plansQuery = useQuery({
    queryKey: queryKeys.billing.plans(),
    queryFn: billingApi.listPlans,
    enabled: Boolean(activeOrganizationId),
  });

  const billingRecordsQuery = useQuery<BillingRecord[]>({
    queryKey: queryKeys.billing.list(),
    queryFn: () => billingApi.list({ limit: 50 }),
    enabled: Boolean(activeOrganizationId),
  });

  const stripePricingQuery = useQuery({
    queryKey: [...queryKeys.billing.plans(), "stripe-pricing"],
    queryFn: billingApi.getCheckoutPricing,
    enabled: Boolean(activeOrganizationId),
    staleTime: 60_000,
  });

  const [selectedPlan, setSelectedPlan] = useState<PaidPlanKey>("growth");

  const startCheckoutMutation = useMutation({
    mutationFn: () =>
      billingApi.createCheckoutSession({
        plan: selectedPlan,
        successPath: "/app/billing?checkout=success",
        cancelPath: "/app/billing?checkout=cancel",
      }),
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    const currentPlan = usageQuery.data?.plan;
    if (currentPlan && isPaidPlan(currentPlan)) {
      setSelectedPlan(currentPlan);
    }
  }, [usageQuery.data?.plan]);

  const paidPlanActive = useMemo(() => {
    if (!usageQuery.data) {
      return false;
    }

    return (
      isPaidPlan(usageQuery.data.plan) && usageQuery.data.status !== "suspended"
    );
  }, [usageQuery.data]);

  const paidPlans = useMemo(
    () =>
      (plansQuery.data ?? []).filter(
        (plan): plan is PaidBillingPlan => isPaidPlan(plan.plan),
      ),
    [plansQuery.data],
  );

  const checkoutPricingByPlan = useMemo(() => {
    return new Map(
      (stripePricingQuery.data?.items ?? []).map((item) => [item.plan, item]),
    );
  }, [stripePricingQuery.data?.items]);

  const selectedPlanPricing = checkoutPricingByPlan.get(selectedPlan);
  const currentPlanPricing = useMemo(() => {
    const currentPlan = usageQuery.data?.plan;
    if (!currentPlan || !isPaidPlan(currentPlan)) {
      return null;
    }

    return checkoutPricingByPlan.get(currentPlan) ?? null;
  }, [checkoutPricingByPlan, usageQuery.data?.plan]);

  const checkoutStatus = searchParams.get("checkout");

  const billingColumns: DataTableColumn<BillingRecord>[] = [
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
      width: "140px",
      render: (row) => (
        <span className="font-medium text-foreground">
          {formatCents(row.amountCents)}
        </span>
      ),
    },
    {
      key: "dueDate",
      header: "Due",
      width: "180px",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(row.dueDate)}
        </span>
      ),
    },
    {
      key: "paidAt",
      header: "Paid",
      width: "180px",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(row.paidAt)}
        </span>
      ),
    },
  ];

  if (!activeOrganizationId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Billing"
          description="Billing data becomes available after an organization is active."
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/app/organization-setup">Set up organization</Link>
            </Button>
          }
        />
        <EmptyState
          icon={CreditCard}
          title="Organization required"
          description="Create or select an organization before using billing."
          action={{
            label: "Open organization setup",
            onClick: () => {
              window.location.assign("/app/organization-setup");
            },
          }}
        />
      </div>
    );
  }

  if (!paidPlanActive) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Billing"
          description="Choose a paid plan to unlock full billing, usage insights, and invoicing workflows."
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {organizations.length > 1 && (
                <div className="min-w-[220px]">
                  <Select
                    value={selectedOrganizationId}
                    onChange={(event) => {
                      const nextOrganizationId = event.target.value;
                      if (
                        !nextOrganizationId ||
                        nextOrganizationId === selectedOrganizationId
                      ) {
                        return;
                      }

                      switchOrganizationMutation.mutate(nextOrganizationId);
                    }}
                    disabled={
                      switchOrganizationMutation.isPending ||
                      organizationsQuery.isLoading
                    }
                    className="h-9 bg-background text-sm"
                  >
                    {organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void usageQuery.refetch();
                  void plansQuery.refetch();
                  void stripePricingQuery.refetch();
                }}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Refresh
              </Button>
            </div>
          }
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Current Plan"
            value={usageQuery.data?.plan ?? "starter"}
            subtitle={usageQuery.data?.status ?? "inactive"}
            icon={CreditCard}
            isLoading={usageQuery.isLoading}
          />
          <StatCard
            title="Credits Included"
            value={usageQuery.data?.aiCreditsIncluded ?? "-"}
            subtitle="Monthly allowance"
            isLoading={usageQuery.isLoading}
          />
          <StatCard
            title="Credits Used"
            value={usageQuery.data?.aiCreditsUsed ?? "-"}
            subtitle={`Remaining ${usageQuery.data?.remainingCredits ?? "-"}`}
            isLoading={usageQuery.isLoading}
          />
          <StatCard
            title="Billing Cycle"
            value={formatDateTime(usageQuery.data?.cycleStartAt)}
            subtitle={`Ends ${formatDateTime(usageQuery.data?.cycleEndAt)}`}
            isLoading={usageQuery.isLoading}
          />
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Pricing</h2>
            <p className="text-sm text-muted-foreground">
              Your workspace is on starter. Select a paid plan to continue to hosted Stripe checkout.
            </p>
          </div>

          {checkoutStatus === "success" && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              Stripe checkout completed. Refresh to pull the latest subscription status.
            </div>
          )}

          {checkoutStatus === "cancel" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              Stripe checkout was canceled. You can retry at any time.
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {paidPlans.map((plan) => (
              <PricingPlanCard
                key={plan.plan}
                plan={plan}
                pricing={checkoutPricingByPlan.get(plan.plan)}
                selected={selectedPlan === plan.plan}
                onSelect={setSelectedPlan}
              />
            ))}
          </div>

          {selectedPlanPricing && !selectedPlanPricing.available && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              Pricing for {selectedPlan} is not configured in Stripe yet. Add the corresponding
              Stripe price ID, then retry checkout.
            </div>
          )}

          {!canManageBilling && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              Ask an owner or admin to complete payment for this organization.
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              onClick={() => startCheckoutMutation.mutate()}
              disabled={
                !canManageBilling ||
                startCheckoutMutation.isPending ||
                Boolean(selectedPlanPricing && !selectedPlanPricing.available)
              }
            >
              {startCheckoutMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Continue to Stripe checkout
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void usageQuery.refetch();
                void plansQuery.refetch();
                void stripePricingQuery.refetch();
              }}
            >
              Refresh status
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Track your plan, usage, and billing records in one place."
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {organizations.length > 1 && (
              <div className="min-w-[220px]">
                <Select
                  value={selectedOrganizationId}
                  onChange={(event) => {
                    const nextOrganizationId = event.target.value;
                    if (
                      !nextOrganizationId ||
                      nextOrganizationId === selectedOrganizationId
                    ) {
                      return;
                    }

                    switchOrganizationMutation.mutate(nextOrganizationId);
                  }}
                  disabled={
                    switchOrganizationMutation.isPending ||
                    organizationsQuery.isLoading
                  }
                  className="h-9 bg-background text-sm"
                >
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void usageQuery.refetch();
                void billingRecordsQuery.refetch();
                void stripePricingQuery.refetch();
              }}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
          title="Plan Price"
          value={
            usageQuery.data?.plan === "starter"
              ? "Free"
              : formatCheckoutPrice(currentPlanPricing)
          }
          subtitle={formatCheckoutCadence(currentPlanPricing)}
          isLoading={usageQuery.isLoading || stripePricingQuery.isLoading}
        />
        <StatCard
          title="Credits Used"
          value={usageQuery.data?.aiCreditsUsed ?? "-"}
          subtitle={`Remaining ${usageQuery.data?.remainingCredits ?? "-"}`}
          isLoading={usageQuery.isLoading}
        />
        <StatCard
          title="Estimated Overage"
          value={formatCents(usageQuery.data?.estimatedOverageCostCents ?? 0)}
          subtitle="Current cycle"
          isLoading={usageQuery.isLoading}
        />
      </section>

      <DataTable
        columns={billingColumns}
        data={billingRecordsQuery.data ?? []}
        isLoading={billingRecordsQuery.isLoading}
        rowKey={(row) => row.id}
        emptyState={
          <EmptyState
            icon={CreditCard}
            title="No billing records"
            description="Billing records will appear here once invoices are generated."
          />
        }
      />
    </div>
  );
}
