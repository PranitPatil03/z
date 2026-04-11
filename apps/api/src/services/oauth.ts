import { smartMailAccounts } from "@foreman/db";
import { and, eq } from "drizzle-orm";
import type { Request } from "express";
import { env } from "../config/env";
import { db } from "../database";
import { badRequest, notFound, unauthorized } from "../lib/errors";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  disconnectOAuthAccountSchema,
  oauthCallbackSchema,
  oauthStateSchema,
  syncEmailsSchema,
} from "../schemas/oauth.schema";
import { smartMailService } from "./smartmail";
import {
  type SmartMailProvider,
  encryptOpaqueToken,
  signStatePayload,
  verifySignedStatePayload,
} from "./smartmail-provider";

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

function requireEncryptionKey() {
  if (!env.ENCRYPTION_KEY) {
    throw badRequest("ENCRYPTION_KEY is required for OAuth token encryption");
  }

  return env.ENCRYPTION_KEY;
}

function requireProviderConfiguration(provider: SmartMailProvider) {
  if (provider === "gmail") {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw badRequest(
        "Gmail OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
      );
    }
    return;
  }

  if (!env.OUTLOOK_CLIENT_ID || !env.OUTLOOK_CLIENT_SECRET) {
    throw badRequest(
      "Outlook OAuth is disabled. Set OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET to enable it.",
    );
  }
}

function generateState(
  orgId: string,
  userId: string,
  provider: SmartMailProvider,
): string {
  const stateObj = {
    organizationId: orgId,
    userId,
    provider,
    redirectUri:
      env.OAUTH_REDIRECT_URI || "http://localhost:3001/auth/oauth/callback",
    timestamp: Date.now(),
  };

  const payload = Buffer.from(JSON.stringify(stateObj)).toString("base64");
  return signStatePayload(payload, requireEncryptionKey());
}

export const oauthService = {
  async getGmailAuthUrl(request: Request) {
    const { orgId, userId } = requireContext(request);
    requireProviderConfiguration("gmail");

    const state = generateState(orgId, userId, "gmail");
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID || "",
      redirect_uri:
        env.OAUTH_REDIRECT_URI || "http://localhost:3001/auth/oauth/callback",
      response_type: "code",
      scope:
        "openid email https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
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
    requireProviderConfiguration("outlook");

    const state = generateState(orgId, userId, "outlook");
    const params = new URLSearchParams({
      client_id: env.OUTLOOK_CLIENT_ID || "",
      redirect_uri:
        env.OAUTH_REDIRECT_URI || "http://localhost:3001/auth/oauth/callback",
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
    requireProviderConfiguration(provider);

    let stateObj: Record<string, unknown>;
    try {
      const verifiedPayload = verifySignedStatePayload(
        state,
        requireEncryptionKey(),
      );
      stateObj = JSON.parse(
        Buffer.from(verifiedPayload, "base64").toString("utf8"),
      );
    } catch (error) {
      throw unauthorized("Invalid state parameter");
    }

    const validatedState = oauthStateSchema.parse(stateObj);

    if (Date.now() - validatedState.timestamp > 600000) {
      throw unauthorized("State parameter expired (10 minutes max)");
    }

    const tokenData = await smartMailService.exchangeOAuthCode({
      provider,
      code,
    });

    if (!tokenData.email) {
      throw badRequest("Unable to resolve email from OAuth provider response");
    }

    const key = requireEncryptionKey();
    const encryptedAccessToken = encryptOpaqueToken(tokenData.accessToken, key);
    const encryptedRefreshToken = tokenData.refreshToken
      ? encryptOpaqueToken(tokenData.refreshToken, key)
      : undefined;

    const [existing] = await db
      .select()
      .from(smartMailAccounts)
      .where(
        and(
          eq(smartMailAccounts.organizationId, validatedState.organizationId),
          eq(smartMailAccounts.provider, provider),
          eq(smartMailAccounts.email, tokenData.email),
        ),
      );

    const [account] = existing
      ? await db
          .update(smartMailAccounts)
          .set({
            userId: validatedState.userId,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken ?? existing.refreshToken,
            tokenExpiresAt: tokenData.expiresAt,
            status: "connected",
            revokedAt: null,
            lastSyncStatus: "idle",
            lastSyncError: null,
            updatedAt: new Date(),
          })
          .where(eq(smartMailAccounts.id, existing.id))
          .returning()
      : await db
          .insert(smartMailAccounts)
          .values({
            organizationId: validatedState.organizationId,
            userId: validatedState.userId,
            provider,
            email: tokenData.email,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiresAt: tokenData.expiresAt,
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
      .where(
        and(
          eq(smartMailAccounts.id, body.accountId),
          eq(smartMailAccounts.organizationId, orgId),
        ),
      );

    if (!account) {
      throw notFound("OAuth account not found");
    }

    const [updated] = await db
      .update(smartMailAccounts)
      .set({
        status: "disconnected",
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
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

    const result = await smartMailService.syncAccountByInput({
      orgId,
      accountId: body.accountId,
      projectId: body.projectId,
      maxResults: body.maxResults,
      forceRefresh: body.forceRefresh,
    });

    return {
      success: true,
      organizationId: orgId,
      ...result,
    };
  },
};
