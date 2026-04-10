import { requestData, requestDataWithInit, toQueryString } from "./_shared";

export type ReceiptStatus = "received" | "verified" | "rejected";

export interface Receipt {
  id: string;
  organizationId: string;
  projectId: string;
  purchaseOrderId?: string | null;
  receiptNumber: string;
  receivedAmountCents: number;
  status: ReceiptStatus;
  receivedAt: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateReceiptInput {
  projectId: string;
  purchaseOrderId?: string;
  receiptNumber: string;
  receivedAmountCents: number;
  receivedAt?: string;
  notes?: string;
}

export interface UpdateReceiptInput {
  receivedAmountCents?: number;
  status?: ReceiptStatus;
  receivedAt?: string;
  notes?: string;
}

export const receiptsApi = {
  list: (params?: { projectId?: string }) => {
    const qs = toQueryString(params);
    return requestData<Receipt[]>(`/receipts${qs}`);
  },

  get: (id: string) => requestData<Receipt>(`/receipts/${id}`),

  create: (body: CreateReceiptInput) =>
    requestDataWithInit<Receipt>("/receipts", { method: "POST", body }),

  update: (id: string, body: UpdateReceiptInput) =>
    requestDataWithInit<Receipt>(`/receipts/${id}`, { method: "PATCH", body }),

  archive: (id: string) =>
    requestDataWithInit<Receipt>(`/receipts/${id}`, { method: "DELETE" }),
};
