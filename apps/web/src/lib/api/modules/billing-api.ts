import { requestJson } from "@/lib/api/http-client";
import { requestData, requestDataWithInit, toQueryString } from "./_shared";

export type BillingRecordStatus = "draft" | "issued" | "paid" | "void";
export type SubscriptionPlanKey = "starter" | "growth" | "enterprise";
export type BillingFeatureKey =
  | "ai.generate"
  | "smartmail.ai_draft"
  | "smartmail.sync"
  | "smartmail.multi_account";
export type StripeWebhookProcessingStatus =
  | "processing"
  | "processed"
  | "failed";

export interface BillingFeatureLimits {
  smartmailAccounts: number | null;
}

export interface BillingRecord {
  id: string;
  organizationId: string;
  projectId?: string | null;
  reference: string;
  amountCents: number;
  currency: string;
  status: BillingRecordStatus;
  dueDate?: string | null;
  paidAt?: string | null;
  stripePaymentIntentId?: string | null;
  stripeCustomerId?: string | null;
  subscriptionId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateBillingRecordInput {
  projectId?: string;
  reference: string;
  amountCents: number;
  currency?: string;
  dueDate?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateBillingRecordInput {
  projectId?: string;
  reference?: string;
  amountCents?: number;
  currency?: string;
  status?: BillingRecordStatus;
  dueDate?: string;
  paidAt?: string;
  metadata?: Record<string, unknown>;
}

export interface BillingUsageSummary {
  plan: SubscriptionPlanKey;
  status: "active" | "grace" | "suspended";
  aiCreditsIncluded: number;
  aiCreditsUsed: number;
  remainingCredits: number;
  overageUnits: number;
  estimatedOverageCostCents: number;
  allowOverage: boolean;
  overagePriceCents: number;
  enabledFeatures: BillingFeatureKey[];
  featureLimits: BillingFeatureLimits;
  featureUsageUnits: Record<string, number>;
  cycleStartAt: string;
  cycleEndAt: string;
  graceEndsAt?: string | null;
}

export interface BillingPlan {
  plan: SubscriptionPlanKey;
  aiCreditsIncluded: number;
  allowOverage: boolean;
  overagePriceCents: number;
  enabledFeatures: BillingFeatureKey[];
  limits: BillingFeatureLimits;
}

export interface OrganizationSubscription {
  id: string;
  organizationId: string;
  plan: SubscriptionPlanKey;
  status: "active" | "grace" | "suspended";
  aiCreditsIncluded: number;
  aiCreditsUsed: number;
  allowOverage: boolean;
  overagePriceCents: number;
  cycleStartAt: string;
  cycleEndAt: string;
  graceEndsAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSubscriptionPlanInput {
  plan: SubscriptionPlanKey;
  reason?: string;
}

export interface UpdateSubscriptionPlanResult {
  previousPlan: SubscriptionPlanKey;
  subscription: OrganizationSubscription;
}

export interface CreateStripePaymentIntentInput {
  billingRecordId: string;
  stripeCustomerId: string;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
}

export interface CreateStripeSubscriptionInput {
  stripeCustomerId: string;
  priceId: string;
  billingRecordId: string;
  addOnPriceIds?: string[];
}

export interface CreateStripeSubscriptionResult {
  subscriptionId: string;
  status: string;
}

export interface StripeWebhookEvent {
  id: string;
  stripeEventId: string;
  eventType: string;
  processingStatus: StripeWebhookProcessingStatus;
  error?: string | null;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListStripeWebhookEventsParams {
  status?: StripeWebhookProcessingStatus;
  limit?: number;
}

export interface StripeWebhookEventListResult {
  items: StripeWebhookEvent[];
  total: number;
}

export interface RetryStripeWebhookEventResult {
  retried: boolean;
  eventId: string;
}

export const billingApi = {
  list: (params?: { limit?: number }) =>
    requestData<BillingRecord[]>(`/billing${toQueryString(params)}`),

  get: (billingRecordId: string) =>
    requestData<BillingRecord>(`/billing/${billingRecordId}`),

  create: (body: CreateBillingRecordInput) =>
    requestDataWithInit<BillingRecord>("/billing", {
      method: "POST",
      body,
    }),

  update: (billingRecordId: string, body: UpdateBillingRecordInput) =>
    requestDataWithInit<BillingRecord>(`/billing/${billingRecordId}`, {
      method: "PATCH",
      body,
    }),

  archive: (billingRecordId: string) =>
    requestDataWithInit<BillingRecord>(`/billing/${billingRecordId}`, {
      method: "DELETE",
    }),

  getUsageSummary: () => requestData<BillingUsageSummary>("/billing/usage"),

  listPlans: () => requestData<BillingPlan[]>("/billing/plans"),

  updateSubscriptionPlan: (body: UpdateSubscriptionPlanInput) =>
    requestDataWithInit<UpdateSubscriptionPlanResult>(
      "/billing/subscription/plan",
      {
        method: "PATCH",
        body,
      },
    ),

  createPaymentIntent: (body: CreateStripePaymentIntentInput) =>
    requestJson<PaymentIntentResult>("/billing/stripe/payment-intent", {
      method: "POST",
      body,
    }),

  createSubscription: (body: CreateStripeSubscriptionInput) =>
    requestJson<CreateStripeSubscriptionResult>(
      "/billing/stripe/subscription",
      {
        method: "POST",
        body,
      },
    ),

  listWebhookEvents: (params?: ListStripeWebhookEventsParams) =>
    requestData<StripeWebhookEventListResult>(
      `/billing/stripe/webhook-events${toQueryString(params)}`,
    ),

  retryWebhookEvent: (eventId: string) =>
    requestDataWithInit<RetryStripeWebhookEventResult>(
      `/billing/stripe/webhook-events/${eventId}/retry`,
      {
        method: "POST",
      },
    ),
};
