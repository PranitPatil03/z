import { requestData, requestDataWithInit, toQueryString } from "./_shared";

export type ChangeOrderStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "revision_requested"
  | "closed";

export interface RoutingPolicy {
  approvalStages: string[];
  stageSlaHours: Record<string, number>;
}

export interface DecisionHistoryEntry {
  stage: string;
  decision: string;
  actorUserId: string;
  comment?: string | null;
  at: string;
}

export interface ChangeOrderMetadata {
  routingPolicy?: RoutingPolicy;
  approvalFlow?: {
    currentStageIndex?: number;
    history?: DecisionHistoryEntry[];
  };
  hooks?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ChangeOrder {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  reason: string;
  impactCostCents: number;
  impactDays: number;
  status: ChangeOrderStatus;
  pipelineStage: string;
  deadlineAt?: string | null;
  submittedAt?: string | null;
  resolvedAt?: string | null;
  createdByUserId: string;
  decidedByUserId?: string | null;
  metadata?: ChangeOrderMetadata | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChangeOrderInput {
  projectId: string;
  title: string;
  reason: string;
  impactCostCents?: number;
  impactDays?: number;
  deadlineAt?: string;
  routingPolicy?: {
    approvalStages: string[];
    stageSlaHours?: Record<string, number>;
  };
  metadata?: Record<string, unknown>;
}

export interface UpdateChangeOrderInput {
  title?: string;
  reason?: string;
  impactCostCents?: number;
  impactDays?: number;
  status?: ChangeOrderStatus;
  pipelineStage?: string;
  deadlineAt?: string;
  routingPolicy?: {
    approvalStages: string[];
    stageSlaHours?: Record<string, number>;
  };
  metadata?: Record<string, unknown>;
}

export interface ChangeOrderDecisionInput {
  status: "approved" | "rejected" | "revision_requested" | "closed";
  comment?: string;
}

export interface FileAsset {
  id: string;
  organizationId: string;
  projectId?: string | null;
  entityType: string;
  entityId: string;
  uploadedByUserId: string;
  bucket: string;
  storageKey: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  status: "pending" | "uploaded" | "failed" | "deleted";
  eTag?: string | null;
  metadata?: Record<string, unknown> | null;
  uploadedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export const changeOrdersApi = {
  list: (params: { projectId: string }) => {
    const qs = toQueryString(params);
    return requestData<ChangeOrder[]>(`/change-orders${qs}`);
  },

  get: (id: string) => requestData<ChangeOrder>(`/change-orders/${id}`),

  create: (body: CreateChangeOrderInput) =>
    requestDataWithInit<ChangeOrder>("/change-orders", {
      method: "POST",
      body,
    }),

  update: (id: string, body: UpdateChangeOrderInput) =>
    requestDataWithInit<ChangeOrder>(`/change-orders/${id}`, {
      method: "PATCH",
      body,
    }),

  submit: (id: string) =>
    requestDataWithInit<ChangeOrder>(`/change-orders/${id}/submit`, {
      method: "POST",
    }),

  decide: (id: string, body: ChangeOrderDecisionInput) =>
    requestDataWithInit<ChangeOrder>(`/change-orders/${id}/decision`, {
      method: "POST",
      body,
    }),

  listAttachments: (id: string) =>
    requestData<FileAsset[]>(`/change-orders/${id}/attachments`),

  attachFileAsset: (id: string, fileAssetId: string) =>
    requestDataWithInit<FileAsset>(
      `/change-orders/${id}/attachments/${fileAssetId}`,
      {
        method: "POST",
      },
    ),

  detachFileAsset: (id: string, fileAssetId: string) =>
    requestDataWithInit<FileAsset>(
      `/change-orders/${id}/attachments/${fileAssetId}`,
      {
        method: "DELETE",
      },
    ),
};
