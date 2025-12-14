import { requestData, requestDataWithInit, toQueryString } from "./_shared";

export type POStatus = "draft" | "issued" | "approved" | "closed" | "canceled";

export interface PurchaseOrder {
  id: string;
  organizationId: string;
  projectId: string;
  rfqId?: string | null;
  poNumber: string;
  vendorName: string;
  currency: string;
  totalAmountCents: number;
  status: POStatus;
  issueDate?: string | null;
  createdByUserId: string;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePOInput {
  projectId: string;
  rfqId?: string;
  poNumber: string;
  vendorName: string;
  currency?: string;
  totalAmountCents: number;
  issueDate?: string;
}

export interface UpdatePOInput {
  vendorName?: string;
  currency?: string;
  totalAmountCents?: number;
  status?: POStatus;
  issueDate?: string;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    count: number;
  };
}

export const purchaseOrdersApi = {
  list: (params?: {
    projectId?: string;
  }) => {
    const qs = toQueryString(params);
    return requestData<PurchaseOrder[]>(`/purchase-orders${qs}`);
  },

  get: (id: string) => requestData<PurchaseOrder>(`/purchase-orders/${id}`),

  create: (body: CreatePOInput) =>
    requestDataWithInit<PurchaseOrder>("/purchase-orders", {
      method: "POST",
      body,
    }),

  update: (id: string, body: UpdatePOInput) =>
    requestDataWithInit<PurchaseOrder>(`/purchase-orders/${id}`, {
      method: "PATCH",
      body,
    }),

  archive: (id: string) =>
    requestDataWithInit<PurchaseOrder>(`/purchase-orders/${id}`, {
      method: "DELETE",
    }),
};
