import { requestData, requestDataWithInit, toQueryString } from "./_shared";

export type SubcontractorStatus = "active" | "inactive" | "blocked";

export interface ComplianceSummary {
  total: number;
  pending: number;
  verified: number;
  expiring: number;
  compliant: number;
  nonCompliant: number;
  expired: number;
  dueSoon: number;
  overdue: number;
}

export interface Subcontractor {
  id: string;
  organizationId: string;
  projectId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  trade: string;
  status: SubcontractorStatus;
  portalEnabled: boolean;
  metadata?: Record<string, unknown> | null;
  complianceSummary?: ComplianceSummary;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateSubcontractorInput {
  projectId?: string;
  name: string;
  email?: string;
  phone?: string;
  trade: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateSubcontractorInput {
  projectId?: string;
  name?: string;
  email?: string;
  phone?: string;
  trade?: string;
  status?: SubcontractorStatus;
  metadata?: Record<string, unknown>;
}

export interface InviteSubcontractorPortalInput {
  email?: string;
  projectId?: string;
  temporaryPassword?: string;
  assignedScope?: string;
  milestones?: string[];
  sendInviteEmail?: boolean;
}

export interface PortalInvitation {
  id: string;
  organizationId: string;
  projectId: string;
  subcontractorId: string;
  invitedByUserId: string;
  email: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  assignedScope?: string | null;
  milestones?: string[];
  invitedAt: string;
  acceptedAt?: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface InviteSubcontractorPortalResult {
  subcontractor: Subcontractor;
  project: {
    id: string;
    name: string;
    code: string;
  };
  invitation: PortalInvitation;
  inviteToken: string;
  inviteAcceptUrl: string;
  inviteEmailQueued: boolean;
  inviteEmailJobId?: string | number | null;
}

export type ComplianceStatus =
  | "pending"
  | "verified"
  | "expiring"
  | "expired"
  | "non_compliant"
  | "compliant";

export interface ComplianceItem {
  id: string;
  organizationId: string;
  projectId: string;
  subcontractorId?: string | null;
  complianceType: string;
  status: ComplianceStatus;
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
  deletedAt?: string | null;
}

export interface CreateComplianceItemInput {
  projectId: string;
  subcontractorId?: string;
  complianceType: string;
  highRisk?: boolean;
  dueDate?: string;
  notes?: string;
  evidence?: Record<string, unknown>;
}

export interface UpdateComplianceItemInput {
  subcontractorId?: string;
  complianceType?: string;
  status?: ComplianceStatus;
  highRisk?: boolean;
  reviewerConfirmed?: boolean;
  dueDate?: string;
  notes?: string;
  evidence?: Record<string, unknown>;
}

export interface QueueInsuranceExtractionInput {
  prompt: string;
  sourceFileName?: string;
  sourceUrl?: string;
  provider?: "openai" | "anthropic" | "gemini" | "azure-openai";
  model?: string;
}

export interface QueueInsuranceExtractionResult {
  queued: boolean;
  jobId: string | number | null;
  complianceItemId: string;
}

export interface PrequalificationScore {
  id: string;
  organizationId: string;
  subcontractorId: string;
  projectId?: string | null;
  overallScoreBps: number;
  safetyScoreBps?: number | null;
  financialScoreBps?: number | null;
  complianceScoreBps?: number | null;
  capacityScoreBps?: number | null;
  riskLevel: "low" | "medium" | "high" | "critical";
  modelVersion: string;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  scoredByUserId: string;
  createdAt: string;
}

export interface UpsertPrequalificationScoreInput {
  subcontractorId: string;
  projectId?: string;
  overallScoreBps: number;
  safetyScoreBps?: number;
  financialScoreBps?: number;
  complianceScoreBps?: number;
  capacityScoreBps?: number;
  riskLevel?: "low" | "medium" | "high" | "critical";
  modelVersion?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface ComplianceTemplate {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  complianceType: string;
  defaultDueDays: number;
  required: boolean;
  highRisk: boolean;
  metadata?: Record<string, unknown> | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateComplianceTemplateInput {
  projectId: string;
  name: string;
  complianceType: string;
  defaultDueDays: number;
  required?: boolean;
  highRisk?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateComplianceTemplateInput {
  name?: string;
  complianceType?: string;
  defaultDueDays?: number;
  required?: boolean;
  highRisk?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ApplyComplianceTemplatesInput {
  projectId: string;
  subcontractorId: string;
  dueDateOverride?: string;
}

export interface ApplyComplianceTemplatesResult {
  created: number;
  totalTemplates: number;
  projectId: string;
  subcontractorId: string;
}

export type PayApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "paid";

export interface PayApplication {
  id: string;
  organizationId: string;
  projectId: string;
  subcontractorId: string;
  periodStart: string;
  periodEnd: string;
  status: PayApplicationStatus;
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
  deletedAt?: string | null;
}

export interface PayApplicationLineItem {
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

export interface PayApplicationStatusEvent {
  id: string;
  payApplicationId: string;
  organizationId: string;
  projectId: string;
  subcontractorId: string;
  status: PayApplicationStatus;
  actorType: string;
  actorId: string;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface PayApplicationDetail extends PayApplication {
  lineItems: PayApplicationLineItem[];
  timeline: PayApplicationStatusEvent[];
}

export interface ReviewPayApplicationInput {
  status: "under_review" | "approved" | "rejected" | "paid";
  reason?: string;
  reviewerNotes?: string;
  metadata?: Record<string, unknown>;
}

export type DailyLogReviewStatus = "pending" | "reviewed" | "rejected";

export interface DailyLog {
  id: string;
  organizationId: string;
  projectId: string;
  subcontractorId: string;
  logDate: string;
  laborCount: number;
  equipmentUsed?: string[] | null;
  performedWork: string;
  attachments?: string[] | null;
  reviewStatus: DailyLogReviewStatus;
  reviewNotes?: string | null;
  submittedAt?: string | null;
  reviewerUserId?: string | null;
  reviewedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface DailyLogStatusEvent {
  id: string;
  dailyLogId: string;
  organizationId: string;
  projectId: string;
  subcontractorId: string;
  status: DailyLogReviewStatus;
  actorType: string;
  actorId: string;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface DailyLogDetail extends DailyLog {
  timeline: DailyLogStatusEvent[];
}

export interface ReviewDailyLogInput {
  reviewStatus: "reviewed" | "rejected";
  reviewNotes?: string;
  metadata?: Record<string, unknown>;
}

export const subconnectApi = {
  listSubcontractors: (params?: {
    projectId?: string;
    status?: SubcontractorStatus;
    trade?: string;
    portalEnabled?: boolean;
    includeComplianceSummary?: boolean;
  }) => requestData<Subcontractor[]>(`/subcontractors${toQueryString(params)}`),

  getSubcontractor: (subcontractorId: string) =>
    requestData<Subcontractor>(`/subcontractors/${subcontractorId}`),

  createSubcontractor: (body: CreateSubcontractorInput) =>
    requestDataWithInit<Subcontractor>("/subcontractors", {
      method: "POST",
      body,
    }),

  updateSubcontractor: (
    subcontractorId: string,
    body: UpdateSubcontractorInput,
  ) =>
    requestDataWithInit<Subcontractor>(`/subcontractors/${subcontractorId}`, {
      method: "PATCH",
      body,
    }),

  archiveSubcontractor: (subcontractorId: string) =>
    requestDataWithInit<Subcontractor>(`/subcontractors/${subcontractorId}`, {
      method: "DELETE",
    }),

  inviteSubcontractorPortal: (
    subcontractorId: string,
    body: InviteSubcontractorPortalInput,
  ) =>
    requestDataWithInit<InviteSubcontractorPortalResult>(
      `/subcontractors/${subcontractorId}/portal-invite`,
      {
        method: "POST",
        body,
      },
    ),

  listComplianceItems: (params?: {
    projectId?: string;
    subcontractorId?: string;
    status?: ComplianceStatus;
    complianceType?: string;
    highRiskOnly?: boolean;
  }) => requestData<ComplianceItem[]>(`/compliance${toQueryString(params)}`),

  getComplianceItem: (complianceItemId: string) =>
    requestData<ComplianceItem>(`/compliance/${complianceItemId}`),

  createComplianceItem: (body: CreateComplianceItemInput) =>
    requestDataWithInit<ComplianceItem>("/compliance", {
      method: "POST",
      body,
    }),

  updateComplianceItem: (
    complianceItemId: string,
    body: UpdateComplianceItemInput,
  ) =>
    requestDataWithInit<ComplianceItem>(`/compliance/${complianceItemId}`, {
      method: "PATCH",
      body,
    }),

  archiveComplianceItem: (complianceItemId: string) =>
    requestDataWithInit<ComplianceItem>(`/compliance/${complianceItemId}`, {
      method: "DELETE",
    }),

  queueInsuranceExtraction: (
    complianceItemId: string,
    body: QueueInsuranceExtractionInput,
  ) =>
    requestDataWithInit<QueueInsuranceExtractionResult>(
      `/compliance/${complianceItemId}/insurance-extract`,
      {
        method: "POST",
        body,
      },
    ),

  listInvitations: (params?: {
    projectId?: string;
    subcontractorId?: string;
    status?: "pending" | "accepted" | "expired" | "revoked";
    limit?: number;
  }) =>
    requestData<PortalInvitation[]>(
      `/subconnect/invitations${toQueryString(params)}`,
    ),

  upsertPrequalificationScore: (body: UpsertPrequalificationScoreInput) =>
    requestDataWithInit<PrequalificationScore>(
      "/subconnect/prequalification/scores",
      {
        method: "POST",
        body,
      },
    ),

  getLatestPrequalificationScore: (subcontractorId: string) =>
    requestData<PrequalificationScore>(
      `/subconnect/prequalification/${subcontractorId}`,
    ),

  listComplianceTemplates: (projectId: string) =>
    requestData<ComplianceTemplate[]>(
      `/subconnect/compliance/templates${toQueryString({ projectId })}`,
    ),

  createComplianceTemplate: (body: CreateComplianceTemplateInput) =>
    requestDataWithInit<ComplianceTemplate>(
      "/subconnect/compliance/templates",
      {
        method: "POST",
        body,
      },
    ),

  updateComplianceTemplate: (
    templateId: string,
    body: UpdateComplianceTemplateInput,
  ) =>
    requestDataWithInit<ComplianceTemplate>(
      `/subconnect/compliance/templates/${templateId}`,
      {
        method: "PATCH",
        body,
      },
    ),

  archiveComplianceTemplate: (templateId: string) =>
    requestDataWithInit<ComplianceTemplate>(
      `/subconnect/compliance/templates/${templateId}`,
      {
        method: "DELETE",
      },
    ),

  applyComplianceTemplates: (body: ApplyComplianceTemplatesInput) =>
    requestDataWithInit<ApplyComplianceTemplatesResult>(
      "/subconnect/compliance/templates/apply",
      {
        method: "POST",
        body,
      },
    ),

  listPayApplications: (params?: {
    projectId?: string;
    subcontractorId?: string;
    status?: PayApplicationStatus;
    limit?: number;
  }) =>
    requestData<PayApplication[]>(
      `/subconnect/pay-applications${toQueryString(params)}`,
    ),

  getPayApplication: (payApplicationId: string) =>
    requestData<PayApplicationDetail>(
      `/subconnect/pay-applications/${payApplicationId}`,
    ),

  reviewPayApplication: (
    payApplicationId: string,
    body: ReviewPayApplicationInput,
  ) =>
    requestDataWithInit<PayApplication>(
      `/subconnect/pay-applications/${payApplicationId}/review`,
      {
        method: "POST",
        body,
      },
    ),

  listDailyLogs: (params?: {
    projectId?: string;
    subcontractorId?: string;
    reviewStatus?: DailyLogReviewStatus;
    limit?: number;
  }) =>
    requestData<DailyLog[]>(`/subconnect/daily-logs${toQueryString(params)}`),

  getDailyLog: (dailyLogId: string) =>
    requestData<DailyLogDetail>(`/subconnect/daily-logs/${dailyLogId}`),

  reviewDailyLog: (dailyLogId: string, body: ReviewDailyLogInput) =>
    requestDataWithInit<DailyLog>(
      `/subconnect/daily-logs/${dailyLogId}/review`,
      {
        method: "POST",
        body,
      },
    ),
};
