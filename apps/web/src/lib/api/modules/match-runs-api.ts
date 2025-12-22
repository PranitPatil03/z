import { requestData, requestDataWithInit, toQueryString } from "./_shared";

export type MatchRunResult =
  | "matched"
  | "partial_match"
  | "price_variance"
  | "over_bill"
  | "under_receipt";

export interface MatchRun {
  id: string;
  organizationId: string;
  projectId: string;
  invoiceId: string;
  purchaseOrderId?: string | null;
  receiptId?: string | null;
  result: MatchRunResult;
  toleranceBps: number;
  varianceCents: number;
  details?: Record<string, unknown> | null;
  createdByUserId: string;
  createdAt: string;
}

export interface CreateMatchRunInput {
  projectId: string;
  invoiceId: string;
  purchaseOrderId?: string;
  receiptId?: string;
  toleranceBps?: number;
}

export const matchRunsApi = {
  list: (params?: { invoiceId?: string; projectId?: string }) => {
    const qs = toQueryString(params);
    return requestData<MatchRun[]>(`/match-runs${qs}`);
  },

  get: (id: string) => requestData<MatchRun>(`/match-runs/${id}`),

  create: (body: CreateMatchRunInput) =>
    requestDataWithInit<MatchRun>("/match-runs", { method: "POST", body }),
};
