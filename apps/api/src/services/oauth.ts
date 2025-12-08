import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { smartMailAccounts } from "@foreman/db";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, notFound, unauthorized } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  connectOAuthAccountSchema,
  disconnectOAuthAccountSchema,
  oauthCallbackSchema,
  oauthStateSchema,
  syncEmailsSchema,
} from "../schemas/oauth.schema";
import { env } from "../config/env";

function readValidatedBody<T>(request: Request) {
  return (request as ValidatedRequest).validated?.body as T;
}

function requireContext(request: Request) {
  const { session, user } = getAuthContext(request);
  if (!session.activeOrganizationId) {
    throw badRequest("An active organization is required");
  }
  return { orgId: session.activeOrganizationId, userId: user.id };
}

function encryptToken(token: string): string {
  const key = crypto.scryptSync(env.ENCRYPTION_KEY || "default-key-do-not-use", "salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decryptToken(encryptedWithIv: string): string {
  try {
    const [ivHex, encrypted] = encryptedWithIv.split(":");
    const key = crypto.scryptSync(env.ENCRYPTION_KEY || "default-key-do-not-use", "salt", 32);
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    throw new Error("Failed to decrypt token");
  }
}

function generateState(orgId: string, userId: string, provider: "gmail" | "outlook"): string {
  const stateObj = {
    organizationId: orgId,
    userId,
    provider,
    redirectUri: env.OAUTH_REDIRECT_URI || "http://localhost:3001/auth/oauth/callback",
    timestamp: Date.now(),
  };

  return Buffer.from(JSON.stringify(stateObj)).toString("base64");
}

async function exchangeGoogleCode(code: string): Promise<{ accessToken: string; refreshToken?: string; email: string }> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID || "",
      client_secret: env.GOOGLE_CLIENT_SECRET || "",
      code,
      grant_type: "authorization_code",
      redirect_uri: env.OAUTH_REDIRECT_URI || "http://localhost:3001/auth/oauth/callback",
    }).toString(),
  });

  if (!response.ok) {
    throw badRequest("Failed to exchange Google authorization code");
  }

  const data = (await response.json()) as Record<string, unknown>;

  const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });

  if (!userResponse.ok) {
    throw badRequest("Failed to get Google user info");
  }

  const userData = (await userResponse.json()) as Record<string, unknown>;

  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string | undefined) ?? undefined,
    email: (userData.email as string) ?? "",
  };
}

async function exchangeOutlookCode(code: string): Promise<{ accessToken: string; refreshToken?: string; email: string }> {
  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.OUTLOOK_CLIENT_ID || "",
      client_secret: env.OUTLOOK_CLIENT_SECRET || "",
      code,
      grant_type: "authorization_code",
      redirect_uri: env.OAUTH_REDIRECT_URI || "http://localhost:3001/auth/oauth/callback",
      scope: "Mail.Read Mail.Send offline_access",
    }).toString(),
  });

  if (!response.ok) {
    throw badRequest("Failed to exchange Outlook authorization code");
  }

  const data = (await response.json()) as Record<string, unknown>;

  const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });

  if (!userResponse.ok) {
    throw badRequest("Failed to get Outlook user info");
  }

  const userData = (await userResponse.json()) as Record<string, unknown>;

  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string | undefined) ?? undefined,
    email: (userData.userPrincipalName as string) ?? (userData.mail as string) ?? "",
  };
}

export const oauthService = {
  async getGmailAuthUrl(request: Request) {
    const { orgId, userId } = requireContext(request);

    const state = generateState(orgId, userId, "gmail");
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID || "",
      redirect_uri: env.OAUTH_REDIRECT_URI || "http://localhost:3001/auth/oauth/callback",
      response_type: "code",
      scope: "openid email https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
      state,
      access_type: "offline",
      prompt: "consent",
    });

    return {
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      state,
    };
  },

  async getOutlookAuthUrl(request: Request) {
    const { orgId, userId } = requireContext(request);

    const state = generateState(orgId, userId, "outlook");
    const params = new URLSearchParams({
      client_id: env.OUTLOOK_CLIENT_ID || "",
      redirect_uri: env.OAUTH_REDIRECT_URI || "http://localhost:3001/auth/oauth/callback",
      response_type: "code",
      scope: "Mail.Read Mail.Send offline_access",
      state,
      prompt: "login",
    });

    return {
      authUrl: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`,
      state,
    };
  },

  async handleOAuthCallback(request: Request) {
    const body = oauthCallbackSchema.parse(readValidatedBody(request));
    const { code, state, provider } = body;

    let stateObj: Record<string, unknown>;
    try {
      stateObj = JSON.parse(Buffer.from(state, "base64").toString("utf8"));
    } catch {
      throw unauthorized("Invalid state parameter");
    }

    const validatedState = oauthStateSchema.parse(stateObj);

    if (Date.now() - validatedState.timestamp > 600000) {
      throw unauthorized("State parameter expired (10 minutes max)");
    }

    let tokenData: { accessToken: string; refreshToken?: string; email: string };

    if (provider === "gmail") {
      tokenData = await exchangeGoogleCode(code);
    } else {
      tokenData = await exchangeOutlookCode(code);
    }

    const encryptedAccessToken = encryptToken(tokenData.accessToken);
    const encryptedRefreshToken = tokenData.refreshToken ? encryptToken(tokenData.refreshToken) : undefined;

    const [account] = await db
      .insert(smartMailAccounts)
      .values({
        organizationId: validatedState.organizationId,
        userId: validatedState.userId,
        provider,
        email: tokenData.email,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        status: "connected",
      })
      .returning();

    return {
      success: true,
      account: {
        id: account.id,
        email: account.email,
        provider: account.provider,
        status: account.status,
        connectedAt: account.connectedAt,
      },
    };
  },

  async disconnectAccount(request: Request) {
    const { orgId } = requireContext(request);
    const body = disconnectOAuthAccountSchema.parse(readValidatedBody(request));

    const [account] = await db
      .select()
      .from(smartMailAccounts)
      .where(and(eq(smartMailAccounts.id, body.accountId), eq(smartMailAccounts.organizationId, orgId)));

    if (!account) {
      throw notFound("OAuth account not found");
    }

    const [updated] = await db
      .update(smartMailAccounts)
      .set({ status: "disconnected", updatedAt: new Date() })
      .where(eq(smartMailAccounts.id, body.accountId))
      .returning();

    return {
      success: true,
      account: {
        id: updated.id,
        email: updated.email,
        status: updated.status,
      },
    };
  },

  async syncEmails(request: Request) {
    const { orgId } = requireContext(request);
    const body = syncEmailsSchema.parse(readValidatedBody(request));

    const [account] = await db
      .select()
      .from(smartMailAccounts)
      .where(and(eq(smartMailAccounts.id, body.accountId), eq(smartMailAccounts.organizationId, orgId)));

    if (!account) {
      throw notFound("OAuth account not found");
    }

    if (account.status !== "connected" || !account.accessToken) {
      throw badRequest("Account is not connected or token is missing");
    }

    try {
      const accessToken = decryptToken(account.accessToken);

      if (account.provider === "gmail") {
        const response = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=${body.maxResults}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch Gmail messages");
        }

        const data = (await response.json()) as Record<string, unknown>;

        await db
          .update(smartMailAccounts)
          .set({ lastSyncAt: new Date(), updatedAt: new Date() })
          .where(eq(smartMailAccounts.id, account.id));

        return {
          success: true,
          provider: "gmail",
          messageCount: Array.isArray(data.messages) ? data.messages.length : 0,
          lastSync: new Date(),
        };
      } else {
        const response = await fetch(
          `https://graph.microsoft.com/v1.0/me/mailfolders/inbox/messages?$top=${body.maxResults}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch Outlook messages");
        }

        const data = (await response.json()) as Record<string, unknown>;

        await db
          .update(smartMailAccounts)
          .set({ lastSyncAt: new Date(), updatedAt: new Date() })
          .where(eq(smartMailAccounts.id, account.id));

        return {
          success: true,
          provider: "outlook",
          messageCount: Array.isArray(data.value) ? data.value.length : 0,
          lastSync: new Date(),
        };
      }
    } catch (error) {
      await db
        .update(smartMailAccounts)
        .set({ status: "error", updatedAt: new Date() })
        .where(eq(smartMailAccounts.id, account.id));

      throw badRequest(`Email sync failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
};
