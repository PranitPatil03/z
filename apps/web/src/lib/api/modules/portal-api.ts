import { requestJson } from "@/lib/api/http-client";
import { toQueryString } from "./_shared";

export interface PortalSubcontractor {
  id: string;
  email: string | null;
  name: string;
  trade: string;
  projectId?: string | null;
}

export interface PortalLoginResponse {
  token: string;
  subcontractor: PortalSubcontractor;
}

export interface PortalRegisterResponse {
  id: string;
  email: string | null;
  name: string;
  projectId?: string | null;
  message: string;
}

export interface PortalRegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  trade: string;
  projectCode: string;
}

export interface PortalAcceptInvitationInput {
  token: string;
  password: string;
  name?: string;
  phone?: string;
}

export interface PortalPasswordResetRequestInput {
  email: string;
}

export interface PortalPasswordResetRequestResponse {
  accepted: boolean;
  resetToken?: string;
  resetUrl?: string;
  expiresAt?: string;
}

export interface PortalPasswordResetConfirmInput {
  token: string;
  password: string;
}

export interface PortalPasswordResetConfirmResponse {
  success: boolean;
}

export interface PortalProfile {
  subcontractorId: string;
  organizationId: string;
  email: string;
  name: string;
  projectId?: string | null;
}

export interface PortalOverview {
  subcontractor: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    trade: string;
    status: string;
  };
  project: {
    id: string;
    code: string;
    name: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
  } | null;
  assignedScope: string;
  milestones: string[];
  complianceSummary: {
    total: number;
    pending: number;
    verified: number;
    expiring: number;
    compliant: number;
    nonCompliant: number;
    expired: number;
    dueSoon: number;
    overdue: number;
  };
  timeline: {
    lastPortalLoginAt: string | null;
    invitedAt: string | null;
    payApplications: Array<{
      id: string;
      status: string;
      totalAmountCents: number;
      currency: string;
      submittedAt: string | null;
      reviewedAt: string | null;
      updatedAt: string;
    }>;
    dailyLogs: Array<{
      id: string;
      logDate: string;
      reviewStatus: string;
      submittedAt: string;
      reviewedAt: string | null;
    }>;
  };
}

export type PortalComplianceStatus =
  | "pending"
  | "verified"
  | "expiring"
  | "expired"
  | "non_compliant"
  | "compliant";

export interface PortalComplianceItem {
  id: string;
  organizationId: string;
  projectId: string;
  subcontractorId?: string | null;
  complianceType: string;
  status: PortalComplianceStatus;
  highRisk: boolean;
  dueDate?: string | null;
  notes?: string | null;
  evidence?: Record<string, unknown> | null;
  reviewerConfirmedAt?: string | null;
  reviewerConfirmedByUserId?: string | null;
  reminderSentAt?: string | null;
  escalationSentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortalComplianceUploadInput {
  complianceItemId: string;
  evidence?: string;
  notes?: string;
}

export type PortalPayApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "paid";

export interface PortalPayApplicationLineItem {
  id: string;
  payApplicationId: string;
  description: string;
  costCode?: string | null;
  quantityUnits: number;
  unitAmountCents?: number | null;
  amountCents: number;
  evidence?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface PortalPayApplication {
  id: string;
  organizationId: string;
  projectId: string;
  subcontractorId: string;
  periodStart: string;
  periodEnd: string;
  status: PortalPayApplicationStatus;
  totalAmountCents: number;
  currency: string;
  summary?: string | null;
  evidence?: Record<string, unknown> | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewerUserId?: string | null;
  rejectionReason?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortalPayApplicationStatusEvent {
  id: string;
  payApplicationId: string;
  organizationId: string;
  projectId: string;
  subcontractorId: string;
  status: PortalPayApplicationStatus;
  actorType: string;
  actorId: string;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface PortalPayApplicationDetail extends PortalPayApplication {
  lineItems: PortalPayApplicationLineItem[];
  timeline: PortalPayApplicationStatusEvent[];
}

export interface PortalCreatePayApplicationLineItemInput {
  description: string;
  costCode?: string;
  quantityUnits?: number;
  unitAmountCents?: number;
  amountCents: number;
  evidence?: Record<string, unknown>;
}

export interface PortalCreatePayApplicationInput {
  periodStart: string;
  periodEnd: string;
  summary?: string;
  currency?: string;
  evidence?: Record<string, unknown>;
  lineItems: PortalCreatePayApplicationLineItemInput[];
}

export interface PortalListPayApplicationsParams {
  status?: PortalPayApplicationStatus;
  limit?: number;
}

export type PortalDailyLogReviewStatus = "pending" | "reviewed" | "rejected";

export interface PortalDailyLog {
  id: string;
  organizationId: string;
  projectId: string;
  subcontractorId: string;
  logDate: string;
  laborCount: number;
  equipmentUsed?: string[] | null;
  performedWork: string;
  attachments?: string[] | null;
  reviewStatus: PortalDailyLogReviewStatus;
  reviewNotes?: string | null;
  submittedAt?: string | null;
  reviewerUserId?: string | null;
  reviewedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortalDailyLogStatusEvent {
  id: string;
  dailyLogId: string;
  organizationId: string;
  projectId: string;
  subcontractorId: string;
  status: PortalDailyLogReviewStatus;
  actorType: string;
  actorId: string;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface PortalDailyLogDetail extends PortalDailyLog {
  timeline: PortalDailyLogStatusEvent[];
}

export interface PortalCreateDailyLogInput {
  logDate: string;
  laborCount: number;
  equipmentUsed?: string[];
  performedWork: string;
  attachments?: string[];
  metadata?: Record<string, unknown>;
}

export interface PortalListDailyLogsParams {
  reviewStatus?: PortalDailyLogReviewStatus;
  limit?: number;
}

export const portalApi = {
  register: (body: PortalRegisterInput) =>
    requestJson<PortalRegisterResponse>("/portal/register", {
      method: "POST",
      body,
      authMode: "portal",
      onAuthFailure: "none",
    }),

  login: (body: { email: string; password: string }) =>
    requestJson<PortalLoginResponse>("/portal/login", {
      method: "POST",
      body,
      authMode: "portal",
      onAuthFailure: "none",
    }),

  acceptInvitation: (body: PortalAcceptInvitationInput) =>
    requestJson<PortalLoginResponse>("/portal/invitations/accept", {
      method: "POST",
      body,
      authMode: "portal",
      onAuthFailure: "none",
    }),

  requestPasswordReset: (body: PortalPasswordResetRequestInput) =>
    requestJson<PortalPasswordResetRequestResponse>(
      "/portal/password-reset/request",
      {
        method: "POST",
        body,
        authMode: "portal",
        onAuthFailure: "none",
      },
    ),

  confirmPasswordReset: (body: PortalPasswordResetConfirmInput) =>
    requestJson<PortalPasswordResetConfirmResponse>(
      "/portal/password-reset/confirm",
      {
        method: "POST",
        body,
        authMode: "portal",
        onAuthFailure: "none",
      },
    ),

  getProfile: () =>
    requestJson<{ profile: PortalProfile }>("/portal/profile", {
      authMode: "portal",
    }),

  getOverview: () =>
    requestJson<{ data: PortalOverview }>("/portal/overview", {
      authMode: "portal",
    }),

  getCompliance: () =>
    requestJson<{ items: PortalComplianceItem[] }>("/portal/compliance", {
      authMode: "portal",
    }),

  updateCompliance: (body: PortalComplianceUploadInput) =>
    requestJson<{ compliance: PortalComplianceItem }>("/portal/compliance", {
      method: "PATCH",
      body,
      authMode: "portal",
    }),

  listPayApplications: (params?: PortalListPayApplicationsParams) =>
    requestJson<{ data: PortalPayApplication[] }>(
      `/portal/pay-applications${toQueryString(
        params
          ? {
              status: params.status,
              limit: params.limit,
            }
          : undefined,
      )}`,
      {
        authMode: "portal",
      },
    ),

  createPayApplication: (body: PortalCreatePayApplicationInput) =>
    requestJson<{ data: PortalPayApplicationDetail }>(
      "/portal/pay-applications",
      {
        method: "POST",
        body,
        authMode: "portal",
      },
    ),

  getPayApplication: (payApplicationId: string) =>
    requestJson<{ data: PortalPayApplicationDetail }>(
      `/portal/pay-applications/${payApplicationId}`,
      {
        authMode: "portal",
      },
    ),

  listDailyLogs: (params?: PortalListDailyLogsParams) =>
    requestJson<{ data: PortalDailyLog[] }>(
      `/portal/daily-logs${toQueryString(
        params
          ? {
              reviewStatus: params.reviewStatus,
              limit: params.limit,
            }
          : undefined,
      )}`,
      {
        authMode: "portal",
      },
    ),

  createDailyLog: (body: PortalCreateDailyLogInput) =>
    requestJson<{ data: PortalDailyLog }>("/portal/daily-logs", {
      method: "POST",
      body,
      authMode: "portal",
    }),

  getDailyLog: (dailyLogId: string) =>
    requestJson<{ data: PortalDailyLogDetail }>(
      `/portal/daily-logs/${dailyLogId}`,
      {
        authMode: "portal",
      },
    ),
};
