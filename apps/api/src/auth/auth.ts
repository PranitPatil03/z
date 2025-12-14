import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import {
  users,
  sessions,
  accounts,
  verifications,
  organizations,
  members,
  invitations,
  teams,
  teamMembers,
} from "@foreman/db";
import { db } from "../database";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { sendMail } from "../lib/email";

export const auth = betterAuth({
  appName: "Foreman",
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/auth",
  secret: env.BETTER_AUTH_SECRET,
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
        subject: "Reset your Foreman password",
        text: `Reset your password using this link: ${url}`,
      });
    },
    onPasswordReset: async ({ user }) => {
      logger.info({ userId: user.id }, "Password reset completed");
    },
  },
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
  trustedOrigins: [env.CORS_ORIGIN],
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Verify your Foreman email address",
        text: `Verify your email using this link: ${url}`,
      });
    },
  },
});
