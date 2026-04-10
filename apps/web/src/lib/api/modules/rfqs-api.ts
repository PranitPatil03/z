import { requestData, requestDataWithInit, toQueryString } from "./_shared";

export type RfqStatus = "draft" | "sent" | "closed" | "canceled";

export interface Rfq {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  scope: string;
  dueDate?: string | null;
  status: RfqStatus;
  createdByUserId: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateRfqInput {
  projectId: string;
  title: string;
  scope: string;
  dueDate?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateRfqInput {
  title?: string;
  scope?: string;
  dueDate?: string;
  status?: RfqStatus;
  metadata?: Record<string, unknown>;
}

export const rfqsApi = {
  list: (params?: { projectId?: string }) => {
    const qs = toQueryString(params);
    return requestData<Rfq[]>(`/rfqs${qs}`);
  },

  get: (id: string) => requestData<Rfq>(`/rfqs/${id}`),

  create: (body: CreateRfqInput) =>
    requestDataWithInit<Rfq>("/rfqs", { method: "POST", body }),

  update: (id: string, body: UpdateRfqInput) =>
    requestDataWithInit<Rfq>(`/rfqs/${id}`, { method: "PATCH", body }),

  archive: (id: string) =>
    requestDataWithInit<Rfq>(`/rfqs/${id}`, { method: "DELETE" }),
};
