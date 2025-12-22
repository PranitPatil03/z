import { requestData, requestDataWithInit, toQueryString } from "./_shared";

export type InvoiceStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "paid"
  | "hold";

export interface Invoice {
  id: string;
  organizationId: string;
  projectId: string;
  purchaseOrderId?: string | null;
  invoiceNumber: string;
  vendorName: string;
  currency: string;
  totalAmountCents: number;
  status: InvoiceStatus;
  dueDate?: string | null;
  receivedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceInput {
  projectId: string;
  purchaseOrderId?: string;
  invoiceNumber: string;
  vendorName: string;
  currency?: string;
  totalAmountCents: number;
  dueDate?: string;
}

export interface UpdateInvoiceInput {
  vendorName?: string;
  currency?: string;
  totalAmountCents?: number;
  status?: InvoiceStatus;
  dueDate?: string;
  allowPayOverride?: boolean;
  payOverrideReason?: string;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    count: number;
  };
}

export const invoicesApi = {
  list: (params?: {
    cursor?: string;
    limit?: number;
    direction?: "forward" | "backward";
    projectId?: string;
    status?: InvoiceStatus;
  }) => {
    const qs = toQueryString(params);
    return requestData<CursorPaginatedResponse<Invoice>>(`/invoices${qs}`);
  },

  get: (id: string) => requestData<Invoice>(`/invoices/${id}`),

  create: (body: CreateInvoiceInput) =>
    requestDataWithInit<Invoice>("/invoices", { method: "POST", body }),

  update: (id: string, body: UpdateInvoiceInput) =>
    requestDataWithInit<Invoice>(`/invoices/${id}`, {
      method: "PATCH",
      body,
    }),

  archive: (id: string) =>
    requestDataWithInit<Invoice>(`/invoices/${id}`, { method: "DELETE" }),
};
