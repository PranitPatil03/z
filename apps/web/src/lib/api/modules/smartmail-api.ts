import { requestData, requestDataWithInit, toQueryString } from "./_shared";

export type SmartMailProvider = "gmail" | "outlook";
export type SmartMailAccountStatus = "connected" | "disconnected" | "error";
export type SmartMailLinkedEntityType =
  | "purchase_order"
  | "invoice"
  | "change_order"
  | "subcontractor";
export type SmartMailMessageDirection = "inbound" | "outbound";
export type SmartMailMessageStatus =
  | "draft"
  | "queued"
  | "sent"
  | "received"
  | "failed";
export type SmartMailTemplateType = "template" | "snippet";

export interface SmartMailAccount {
  id: string;
  organizationId: string;
  userId: string;
  provider: SmartMailProvider;
  email: string;
  status: SmartMailAccountStatus;
  tokenExpiresAt?: string | null;
  connectedAt: string;
  lastSyncAt?: string | null;
  syncCursor?: string | null;
  lastSyncStatus?: string | null;
  lastSyncError?: string | null;
  autoSyncEnabled: boolean;
  defaultProjectId?: string | null;
  revokedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SmartMailThread {
  id: string;
  organizationId: string;
  projectId: string;
  accountId: string;
  subject: string;
  externalThreadId?: string | null;
  participants: string[];
  lastMessageAt?: string | null;
  linkedEntityType?: SmartMailLinkedEntityType | null;
  linkedEntityId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SmartMailMessage {
  id: string;
  threadId: string;
  organizationId: string;
  projectId: string;
  externalMessageId?: string | null;
  direction: SmartMailMessageDirection;
  status: SmartMailMessageStatus;
  fromEmail: string;
  toEmail: string;
  ccEmails: string[];
  bccEmails: string[];
  subject: string;
  body: string;
  linkedEntityType?: SmartMailLinkedEntityType | null;
  linkedEntityId?: string | null;
  linkConfidenceBps: number;
  linkReason?: string | null;
  linkOverriddenByUserId?: string | null;
  linkOverriddenAt?: string | null;
  aiDraft: number;
  isAiDraft: boolean;
  aiModel?: string | null;
  aiPromptTemplateVersion?: string | null;
  sendError?: string | null;
  providerMetadata?: Record<string, unknown> | null;
  externalCreatedAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SmartMailTemplate {
  id: string;
  organizationId: string;
  projectId?: string | null;
  createdByUserId: string;
  name: string;
  type: SmartMailTemplateType;
  subjectTemplate: string;
  bodyTemplate: string;
  variables: string[];
  isShared: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface SmartMailSyncResult {
  accountId: string;
  projectId: string;
  fetchedCount: number;
  upsertedCount: number;
  cursor: string | null;
  syncedAt: string;
}

export interface SmartMailDraftResult {
  draft: string;
  message: SmartMailMessage;
  usage?: {
    units: number;
    aiCreditsIncluded: number;
    aiCreditsUsed: number;
  };
}

export interface CreateSmartMailAccountInput {
  provider: SmartMailProvider;
  email: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  autoSyncEnabled?: boolean;
  defaultProjectId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateSmartMailAccountInput {
  status?: SmartMailAccountStatus;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  autoSyncEnabled?: boolean;
  defaultProjectId?: string;
  metadata?: Record<string, unknown>;
}

export interface SyncSmartMailAccountInput {
  projectId?: string;
  maxResults?: number;
}

export interface ListSmartMailThreadsParams {
  projectId: string;
  accountId?: string;
}

export interface CreateSmartMailThreadInput {
  projectId: string;
  accountId: string;
  subject: string;
  externalThreadId?: string;
  linkedEntityType?: SmartMailLinkedEntityType;
  linkedEntityId?: string;
}

export interface CreateSmartMailMessageInput {
  projectId: string;
  accountId: string;
  toEmails: string[];
  ccEmails?: string[];
  subject?: string;
  body: string;
  linkedEntityType?: SmartMailLinkedEntityType;
  linkedEntityId?: string;
  aiDraft?: boolean;
  sendNow?: boolean;
  inReplyToMessageId?: string;
  sentAt?: string;
}

export interface CreateSmartMailDraftInput {
  projectId: string;
  accountId: string;
  prompt: string;
  tone?: string;
  provider?: "openai" | "anthropic" | "gemini" | "azure-openai";
  model?: string;
  templateId?: string;
  linkedEntityType?: SmartMailLinkedEntityType;
  linkedEntityId?: string;
}

export interface UpdateSmartMailMessageLinkInput {
  linkedEntityType?: SmartMailLinkedEntityType;
  linkedEntityId?: string;
  clear?: boolean;
}

export interface ListSmartMailTemplatesParams {
  projectId?: string;
  type?: SmartMailTemplateType;
}

export interface CreateSmartMailTemplateInput {
  projectId?: string;
  name: string;
  type?: SmartMailTemplateType;
  subjectTemplate?: string;
  bodyTemplate: string;
  variables?: string[];
  isShared?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateSmartMailTemplateInput {
  name?: string;
  subjectTemplate?: string;
  bodyTemplate?: string;
  variables?: string[];
  isShared?: boolean;
  metadata?: Record<string, unknown>;
}

export const smartmailApi = {
  listAccounts: () => requestData<SmartMailAccount[]>("/smartmail/accounts"),

  createAccount: (body: CreateSmartMailAccountInput) =>
    requestDataWithInit<SmartMailAccount>("/smartmail/accounts", {
      method: "POST",
      body,
    }),

  updateAccount: (accountId: string, body: UpdateSmartMailAccountInput) =>
    requestDataWithInit<SmartMailAccount>(`/smartmail/accounts/${accountId}`, {
      method: "PATCH",
      body,
    }),

  syncAccount: (accountId: string, body: SyncSmartMailAccountInput) =>
    requestDataWithInit<SmartMailSyncResult>(
      `/smartmail/accounts/${accountId}/sync`,
      {
        method: "POST",
        body,
      },
    ),

  listThreads: (params: ListSmartMailThreadsParams) =>
    requestData<SmartMailThread[]>(
      `/smartmail/threads${toQueryString(params)}`,
    ),

  createThread: (body: CreateSmartMailThreadInput) =>
    requestDataWithInit<SmartMailThread>("/smartmail/threads", {
      method: "POST",
      body,
    }),

  listMessages: (threadId: string) =>
    requestData<SmartMailMessage[]>(`/smartmail/threads/${threadId}/messages`),

  createMessage: (threadId: string, body: CreateSmartMailMessageInput) =>
    requestDataWithInit<SmartMailMessage>(
      `/smartmail/threads/${threadId}/messages`,
      {
        method: "POST",
        body,
      },
    ),

  createDraft: (threadId: string, body: CreateSmartMailDraftInput) =>
    requestDataWithInit<SmartMailDraftResult>(
      `/smartmail/threads/${threadId}/drafts`,
      {
        method: "POST",
        body,
      },
    ),

  updateMessageLink: (
    messageId: string,
    body: UpdateSmartMailMessageLinkInput,
  ) =>
    requestDataWithInit<SmartMailMessage>(
      `/smartmail/messages/${messageId}/link`,
      {
        method: "PATCH",
        body,
      },
    ),

  listTemplates: (params?: ListSmartMailTemplatesParams) =>
    requestData<SmartMailTemplate[]>(
      `/smartmail/templates${toQueryString(params)}`,
    ),

  createTemplate: (body: CreateSmartMailTemplateInput) =>
    requestDataWithInit<SmartMailTemplate>("/smartmail/templates", {
      method: "POST",
      body,
    }),

  updateTemplate: (templateId: string, body: UpdateSmartMailTemplateInput) =>
    requestDataWithInit<SmartMailTemplate>(
      `/smartmail/templates/${templateId}`,
      {
        method: "PATCH",
        body,
      },
    ),

  deleteTemplate: (templateId: string) =>
    requestDataWithInit<{ id: string; deletedAt: string | null }>(
      `/smartmail/templates/${templateId}`,
      {
        method: "DELETE",
      },
    ),
};
