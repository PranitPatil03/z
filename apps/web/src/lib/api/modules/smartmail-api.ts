import { requestJson } from "@/lib/api/http-client";
import type { PaginatedResponse } from "./projects-api";

export interface SmartMailAccount {
  id: string;
  organizationId: string;
  provider: "gmail" | "outlook";
  email: string;
  isActive: boolean;
  syncedAt?: string | null;
  createdAt: string;
}

export interface SmartMailThread {
  id: string;
  accountId: string;
  organizationId: string;
  subject: string;
  snippet?: string | null;
  from: string;
  isRead: boolean;
  messageCount: number;
  lastMessageAt: string;
  linkedEntityType?: string | null;
  linkedEntityId?: string | null;
  createdAt: string;
}

export const smartmailApi = {
  listAccounts: () =>
    requestJson<{ data: SmartMailAccount[] }>("/smartmail/accounts"),

  connectAccount: (provider: "gmail" | "outlook") =>
    requestJson<{ authUrl: string }>("/smartmail/connect", {
      method: "POST",
      body: { provider },
    }),

  disconnectAccount: (accountId: string) =>
    requestJson<void>(`/smartmail/accounts/${accountId}`, { method: "DELETE" }),

  listThreads: (params?: {
    cursor?: string;
    limit?: number;
    accountId?: string;
  }) => {
    const qs = params
      ? `?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<string, string>).toString()}`
      : "";
    return requestJson<PaginatedResponse<SmartMailThread>>(
      `/smartmail/threads${qs}`,
    );
  },

  getThread: (id: string) =>
    requestJson<SmartMailThread>(`/smartmail/threads/${id}`),

  syncAccount: (accountId: string) =>
    requestJson<void>(`/smartmail/accounts/${accountId}/sync`, {
      method: "POST",
    }),
};
