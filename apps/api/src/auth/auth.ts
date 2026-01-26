import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import {
  accounts,
  invitations,
  members,
  organizations,
  sessions,
  teamMembers,
  teams,
  users,
  verifications,
} from "@foreman/db";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { env } from "../config/env";
import { db } from "../database";
import { sendMail } from "../lib/email";
import { logger } from "../lib/logger";

const trustedOrigins = Array.from(
  new Set(
    [env.CORS_ORIGIN, env.WEB_APP_URL, "https://*.vercel.app"]
      .flatMap((origin) => origin.split(","))
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
);

const primaryCorsOrigin = env.CORS_ORIGIN.split(",")[0]?.trim();

const webOrigin = (() => {
  const candidate = env.WEB_APP_URL || primaryCorsOrigin;

  if (!candidate) {
    return null;
  }

  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
})();

const authOrigin = (() => {
  try {
    return new URL(env.BETTER_AUTH_URL).origin;
  } catch {
    return null;
  }
})();

const isCrossOriginAuthDeployment =
  Boolean(webOrigin) && Boolean(authOrigin) && webOrigin !== authOrigin;

export const auth = betterAuth({
  appName: "anvil",
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/auth",
  secret: env.BETTER_AUTH_SECRET,
  account: {
    storeStateStrategy: "database",
    // Cross-origin frontend/backend OAuth can fail the extra signed-state-cookie
    // check in modern browsers; DB-backed state validation remains in place.
    skipStateCookieCheck: true,
  },
  advanced: isCrossOriginAuthDeployment
    ? {
        defaultCookieAttributes: {
          sameSite: "none",
          secure: true,
        },
      }
    : undefined,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
      organization: organizations,
      member: members,
      invitation: invitations,
      team: teams,
      teamMember: teamMembers,
    },
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Reset your anvil password",
        text: `Reset your password using this link: ${url}`,
      });
    },
    onPasswordReset: async ({ user }) => {
      logger.info({ userId: user.id }, "Password reset completed");
    },
  },
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,
  plugins: [
    organization({
      teams: {
        enabled: true,
      },
      requireEmailVerificationOnInvitation: true,
      invitationExpiresIn: 60 * 60 * 24 * 7,
      async sendInvitationEmail(data) {
        const inviteLink = `${env.BETTER_AUTH_URL}/accept-invitation/${data.id}`;

        await sendMail({
          to: data.email,
          subject: `Invitation to join ${data.organization.name}`,
          text: `You were invited by ${data.inviter.user.name ?? data.inviter.user.email} to join ${data.organization.name}. Accept here: ${inviteLink}`,
        });
      },
    }),
  ],
  trustedOrigins,
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Verify your anvil email address",
        text: `Verify your email using this link: ${url}`,
      });
    },
  },
});
