import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { db } from "../database";
import { env } from "../config/env";
import { sendMail } from "../lib/email";

export const auth = betterAuth({
  appName: "Foreman",
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/auth",
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
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
      console.info("[auth] password reset complete", { userId: user.id });
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
