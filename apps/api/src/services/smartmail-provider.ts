import crypto from "crypto";

export type SmartMailProvider = "gmail" | "outlook";

export interface OAuthProviderConfig {
  googleClientId?: string;
  googleClientSecret?: string;
  outlookClientId?: string;
  outlookClientSecret?: string;
  redirectUri: string;
}

export interface OAuthExchangeResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  email: string;
}

export interface OAuthRefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface NormalizedSmartMailMessage {
  externalMessageId: string;
  externalThreadId: string;
  internetMessageId?: string;
  subject: string;
  body: string;
  fromEmail: string;
  toEmails: string[];
  ccEmails: string[];
  sentAt: Date;
  direction: "inbound" | "outbound";
  providerMetadata: Record<string, unknown>;
}

export interface FetchProviderMessagesInput {
  provider: SmartMailProvider;
  accessToken: string;
  accountEmail: string;
  maxResults: number;
  since?: Date;
}

export interface SendProviderMessageInput {
  provider: SmartMailProvider;
  accessToken: string;
  fromEmail: string;
  toEmails: string[];
  ccEmails?: string[];
  subject: string;
  body: string;
  inReplyToMessageId?: string;
}

export interface SendProviderMessageResult {
  externalMessageId: string;
  externalThreadId?: string;
  sentAt: Date;
  providerMetadata: Record<string, unknown>;
}

function requireEncryptionSecret(encryptionSecret: string): Buffer {
  if (!encryptionSecret || encryptionSecret.length < 8) {
    throw new Error("ENCRYPTION_KEY must be configured for SmartMail token operations");
  }
  return Buffer.from(encryptionSecret, "utf8");
}

function deriveKey(masterKey: Buffer, salt: Buffer): Buffer {
  return crypto.scryptSync(masterKey, salt, 32);
}

export function encryptOpaqueToken(token: string, encryptionSecret: string): string {
  const masterKey = requireEncryptionSecret(encryptionSecret);
  const salt = crypto.randomBytes(16);
  const key = deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return [salt.toString("hex"), iv.toString("hex"), authTag, encrypted].join(":");
}

export function decryptOpaqueToken(payload: string, encryptionSecret: string): string {
  const [saltHex, ivHex, authTagHex, encrypted] = payload.split(":");
  if (!saltHex || !ivHex || !authTagHex || !encrypted) {
    throw new Error("Invalid encrypted token format");
  }

  const masterKey = requireEncryptionSecret(encryptionSecret);
  const key = deriveKey(masterKey, Buffer.from(saltHex, "hex"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function signStatePayload(payload: string, secret: string): string {
  const signingSecret = requireEncryptionSecret(secret);
  const signature = crypto.createHmac("sha256", signingSecret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifySignedStatePayload(signedState: string, secret: string): string {
  const idx = signedState.lastIndexOf(".");
  if (idx <= 0) {
    throw new Error("Invalid state parameter format");
  }

  const payload = signedState.slice(0, idx);
  const signature = signedState.slice(idx + 1);
  const signingSecret = requireEncryptionSecret(secret);
  const expectedSignature = crypto.createHmac("sha256", signingSecret).update(payload).digest("hex");

  const received = Buffer.from(signature, "hex");
  const expected = Buffer.from(expectedSignature, "hex");
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    throw new Error("State parameter signature verification failed");
  }

  return payload;
}

function parseAddress(raw?: string | null) {
  if (!raw) {
    return "";
  }

  const angleMatch = raw.match(/<([^>]+)>/);
  if (angleMatch?.[1]) {
    return angleMatch[1].trim().toLowerCase();
  }

  return raw.trim().replace(/^"|"$/g, "").toLowerCase();
}

function parseAddressList(raw?: string | null) {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((token) => parseAddress(token))
    .filter(Boolean);
}

function headerValue(headers: Array<{ name?: string; value?: string }> | undefined, name: string) {
  if (!headers) {
    return undefined;
  }
  return headers.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value;
}

function decodeBase64Url(raw?: string) {
  if (!raw) {
    return "";
  }

  const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

interface GmailPayload {
  body?: { data?: string };
  parts?: GmailPayload[];
  mimeType?: string;
}

function extractGmailBody(payload?: GmailPayload): string {
  if (!payload) {
    return "";
  }

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts?.length) {
    for (const part of payload.parts) {
      const value = extractGmailBody(part);
      if (value) {
        return value;
      }
    }
  }

  return payload.body?.data ? decodeBase64Url(payload.body.data) : "";
}

function ensureResponse(response: Response, message: string) {
  if (response.ok) {
    return;
  }
  throw new Error(`${message} (status ${response.status})`);
}

function computeExpiry(expiresIn: unknown): Date | undefined {
  const seconds = Number(expiresIn);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return undefined;
  }

  const expiresAt = new Date();
  expiresAt.setUTCSeconds(expiresAt.getUTCSeconds() + Math.floor(seconds));
  return expiresAt;
}

export async function exchangeGoogleCode(code: string, config: OAuthProviderConfig): Promise<OAuthExchangeResult> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.googleClientId ?? "",
      client_secret: config.googleClientSecret ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }).toString(),
  });

  ensureResponse(response, "Failed to exchange Google authorization code");
  const tokenData = (await response.json()) as Record<string, unknown>;

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  ensureResponse(profileResponse, "Failed to load Google profile");
  const profile = (await profileResponse.json()) as Record<string, unknown>;

  return {
    accessToken: String(tokenData.access_token ?? ""),
    refreshToken: typeof tokenData.refresh_token === "string" ? tokenData.refresh_token : undefined,
    expiresAt: computeExpiry(tokenData.expires_in),
    email: String(profile.email ?? "").toLowerCase(),
  };
}

export async function exchangeOutlookCode(code: string, config: OAuthProviderConfig): Promise<OAuthExchangeResult> {
  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.outlookClientId ?? "",
      client_secret: config.outlookClientSecret ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
      scope: "Mail.Read Mail.Send offline_access",
    }).toString(),
  });

  ensureResponse(response, "Failed to exchange Outlook authorization code");
  const tokenData = (await response.json()) as Record<string, unknown>;

  const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  ensureResponse(profileResponse, "Failed to load Outlook profile");
  const profile = (await profileResponse.json()) as Record<string, unknown>;

  const email = String(profile.userPrincipalName ?? profile.mail ?? "").toLowerCase();

  return {
    accessToken: String(tokenData.access_token ?? ""),
    refreshToken: typeof tokenData.refresh_token === "string" ? tokenData.refresh_token : undefined,
    expiresAt: computeExpiry(tokenData.expires_in),
    email,
  };
}

async function refreshGoogleAccessToken(refreshToken: string, config: OAuthProviderConfig): Promise<OAuthRefreshResult> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.googleClientId ?? "",
      client_secret: config.googleClientSecret ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  ensureResponse(response, "Failed to refresh Google access token");
  const tokenData = (await response.json()) as Record<string, unknown>;

  return {
    accessToken: String(tokenData.access_token ?? ""),
    refreshToken: typeof tokenData.refresh_token === "string" ? tokenData.refresh_token : undefined,
    expiresAt: computeExpiry(tokenData.expires_in),
  };
}

async function refreshOutlookAccessToken(refreshToken: string, config: OAuthProviderConfig): Promise<OAuthRefreshResult> {
  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.outlookClientId ?? "",
      client_secret: config.outlookClientSecret ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "Mail.Read Mail.Send offline_access",
    }).toString(),
  });

  ensureResponse(response, "Failed to refresh Outlook access token");
  const tokenData = (await response.json()) as Record<string, unknown>;

  return {
    accessToken: String(tokenData.access_token ?? ""),
    refreshToken: typeof tokenData.refresh_token === "string" ? tokenData.refresh_token : undefined,
    expiresAt: computeExpiry(tokenData.expires_in),
  };
}

export async function refreshProviderAccessToken(
  provider: SmartMailProvider,
  refreshToken: string,
  config: OAuthProviderConfig,
): Promise<OAuthRefreshResult> {
  if (provider === "gmail") {
    return await refreshGoogleAccessToken(refreshToken, config);
  }
  return await refreshOutlookAccessToken(refreshToken, config);
}

async function fetchGmailMessages(input: FetchProviderMessagesInput): Promise<NormalizedSmartMailMessage[]> {
  const query = new URLSearchParams({
    maxResults: String(Math.max(1, Math.min(100, input.maxResults))),
  });

  if (input.since) {
    const afterSeconds = Math.floor((input.since.getTime() - 60_000) / 1000);
    query.set("q", `after:${afterSeconds}`);
  }

  const listResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${query.toString()}`, {
    headers: { Authorization: `Bearer ${input.accessToken}` },
  });
  ensureResponse(listResponse, "Failed to list Gmail messages");

  const listData = (await listResponse.json()) as {
    messages?: Array<{ id: string }>;
  };

  const messageRefs = listData.messages ?? [];
  const messages: NormalizedSmartMailMessage[] = [];

  for (const ref of messageRefs) {
    const detailResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(ref.id)}?format=full`,
      {
        headers: { Authorization: `Bearer ${input.accessToken}` },
      },
    );

    if (!detailResponse.ok) {
      continue;
    }

    const detail = (await detailResponse.json()) as {
      id?: string;
      threadId?: string;
      internalDate?: string;
      snippet?: string;
      payload?: {
        headers?: Array<{ name?: string; value?: string }>;
        body?: { data?: string };
        parts?: GmailPayload[];
      };
    };

    const fromEmail = parseAddress(headerValue(detail.payload?.headers, "from"));
    const toEmails = parseAddressList(headerValue(detail.payload?.headers, "to"));
    const ccEmails = parseAddressList(headerValue(detail.payload?.headers, "cc"));
    const subject = headerValue(detail.payload?.headers, "subject") ?? "(no subject)";
    const internetMessageId = headerValue(detail.payload?.headers, "message-id");
    const sentAt = detail.internalDate ? new Date(Number(detail.internalDate)) : new Date();
    const body = extractGmailBody(detail.payload) || detail.snippet || "";

    if (!detail.id || !detail.threadId) {
      continue;
    }

    messages.push({
      externalMessageId: detail.id,
      externalThreadId: detail.threadId,
      internetMessageId,
      subject,
      body,
      fromEmail,
      toEmails,
      ccEmails,
      sentAt,
      direction: fromEmail === input.accountEmail.toLowerCase() ? "outbound" : "inbound",
      providerMetadata: {
        source: "gmail",
        snippet: detail.snippet,
      },
    });
  }

  return messages.sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
}

async function fetchOutlookMessages(input: FetchProviderMessagesInput): Promise<NormalizedSmartMailMessage[]> {
  const query = new URLSearchParams({
    $top: String(Math.max(1, Math.min(100, input.maxResults))),
    $orderby: "receivedDateTime desc",
    $select:
      "id,conversationId,internetMessageId,subject,bodyPreview,from,toRecipients,ccRecipients,sentDateTime,receivedDateTime,webLink",
  });

  if (input.since) {
    query.set("$filter", `receivedDateTime ge ${input.since.toISOString()}`);
  }

  const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages?${query.toString()}`, {
    headers: { Authorization: `Bearer ${input.accessToken}` },
  });
  ensureResponse(response, "Failed to list Outlook messages");

  const data = (await response.json()) as {
    value?: Array<{
      id?: string;
      conversationId?: string;
      internetMessageId?: string;
      subject?: string;
      bodyPreview?: string;
      from?: { emailAddress?: { address?: string } };
      toRecipients?: Array<{ emailAddress?: { address?: string } }>;
      ccRecipients?: Array<{ emailAddress?: { address?: string } }>;
      sentDateTime?: string;
      receivedDateTime?: string;
      webLink?: string;
    }>;
  };

  const rows = data.value ?? [];
  const messages: NormalizedSmartMailMessage[] = [];

  for (const row of rows) {
    if (!row.id || !row.conversationId) {
      continue;
    }

    const fromEmail = parseAddress(row.from?.emailAddress?.address);
    const toEmails = (row.toRecipients ?? [])
      .map((recipient) => parseAddress(recipient.emailAddress?.address))
      .filter(Boolean);
    const ccEmails = (row.ccRecipients ?? [])
      .map((recipient) => parseAddress(recipient.emailAddress?.address))
      .filter(Boolean);

    const sentAt = row.sentDateTime
      ? new Date(row.sentDateTime)
      : row.receivedDateTime
        ? new Date(row.receivedDateTime)
        : new Date();

    messages.push({
      externalMessageId: row.id,
      externalThreadId: row.conversationId,
      internetMessageId: row.internetMessageId,
      subject: row.subject ?? "(no subject)",
      body: row.bodyPreview ?? "",
      fromEmail,
      toEmails,
      ccEmails,
      sentAt,
      direction: fromEmail === input.accountEmail.toLowerCase() ? "outbound" : "inbound",
      providerMetadata: {
        source: "outlook",
        webLink: row.webLink,
      },
    });
  }

  return messages.sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
}

export async function fetchProviderMessages(input: FetchProviderMessagesInput): Promise<NormalizedSmartMailMessage[]> {
  if (input.provider === "gmail") {
    return await fetchGmailMessages(input);
  }
  return await fetchOutlookMessages(input);
}

function normalizeMessageId(value: string) {
  if (!value) {
    return value;
  }
  if (value.startsWith("<") && value.endsWith(">")) {
    return value;
  }
  return `<${value}>`;
}

async function sendGmailMessage(input: SendProviderMessageInput): Promise<SendProviderMessageResult> {
  const headers = [
    `From: ${input.fromEmail}`,
    `To: ${input.toEmails.join(", ")}`,
    ...(input.ccEmails && input.ccEmails.length > 0 ? [`Cc: ${input.ccEmails.join(", ")}`] : []),
    `Subject: ${input.subject}`,
    ...(input.inReplyToMessageId ? [`In-Reply-To: ${normalizeMessageId(input.inReplyToMessageId)}`] : []),
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    input.body,
  ];

  const raw = Buffer.from(headers.join("\r\n"), "utf8").toString("base64url");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  ensureResponse(response, "Failed to send Gmail message");
  const data = (await response.json()) as Record<string, unknown>;

  return {
    externalMessageId: String(data.id ?? ""),
    externalThreadId: typeof data.threadId === "string" ? data.threadId : undefined,
    sentAt: new Date(),
    providerMetadata: {
      source: "gmail",
      threadId: data.threadId,
      labelIds: data.labelIds,
    },
  };
}

async function sendOutlookMessage(input: SendProviderMessageInput): Promise<SendProviderMessageResult> {
  const draftResponse = await fetch("https://graph.microsoft.com/v1.0/me/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: input.subject,
      body: {
        contentType: "Text",
        content: input.body,
      },
      toRecipients: input.toEmails.map((address) => ({ emailAddress: { address } })),
      ccRecipients: (input.ccEmails ?? []).map((address) => ({ emailAddress: { address } })),
      internetMessageHeaders: input.inReplyToMessageId
        ? [{ name: "In-Reply-To", value: normalizeMessageId(input.inReplyToMessageId) }]
        : undefined,
    }),
  });

  ensureResponse(draftResponse, "Failed to create Outlook message draft");
  const draft = (await draftResponse.json()) as Record<string, unknown>;
  const messageId = String(draft.id ?? "");

  const sendResponse = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
  });

  ensureResponse(sendResponse, "Failed to send Outlook message");

  return {
    externalMessageId: messageId,
    externalThreadId: typeof draft.conversationId === "string" ? draft.conversationId : undefined,
    sentAt: new Date(),
    providerMetadata: {
      source: "outlook",
      conversationId: draft.conversationId,
      internetMessageId: draft.internetMessageId,
    },
  };
}

export async function sendProviderMessage(input: SendProviderMessageInput): Promise<SendProviderMessageResult> {
  if (input.provider === "gmail") {
    return await sendGmailMessage(input);
  }
  return await sendOutlookMessage(input);
}
