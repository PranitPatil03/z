import { requestJson } from "@/lib/api/http-client";

export type OAuthProvider = "gmail" | "outlook";

export interface OAuthAuthUrlResponse {
  authUrl: string;
  state: string;
}

export interface OAuthCallbackInput {
  code: string;
  state: string;
  provider: OAuthProvider;
}

export interface OAuthCallbackResponse {
  success: boolean;
  account: {
    id: string;
    email: string;
    provider: OAuthProvider;
    status: "connected" | "disconnected" | "error";
    connectedAt?: string | null;
  };
}

export interface OAuthDisconnectInput {
  accountId: string;
}

export interface OAuthDisconnectResponse {
  success: boolean;
  account: {
    id: string;
    email: string;
    status: "connected" | "disconnected" | "error";
  };
}

export interface OAuthSyncEmailsInput {
  accountId: string;
  projectId?: string;
  maxResults?: number;
  forceRefresh?: boolean;
}

export interface OAuthSyncEmailsResponse {
  success: boolean;
  organizationId: string;
  accountId: string;
  projectId: string;
  fetchedCount: number;
  upsertedCount: number;
  cursor: string | null;
  syncedAt: string;
}

export const oauthApi = {
  getGmailAuthUrl: () =>
    requestJson<OAuthAuthUrlResponse>("/auth/oauth/gmail/auth-url"),

  getOutlookAuthUrl: () =>
    requestJson<OAuthAuthUrlResponse>("/auth/oauth/outlook/auth-url"),

  handleOAuthCallback: (body: OAuthCallbackInput) =>
    requestJson<OAuthCallbackResponse>("/auth/oauth/callback", {
      method: "POST",
      body,
    }),

  disconnectOAuthAccount: (body: OAuthDisconnectInput) =>
    requestJson<OAuthDisconnectResponse>("/auth/oauth/disconnect", {
      method: "POST",
      body,
    }),

  syncEmails: (body: OAuthSyncEmailsInput) =>
    requestJson<OAuthSyncEmailsResponse>("/auth/oauth/sync-emails", {
      method: "POST",
      body,
    }),
};
