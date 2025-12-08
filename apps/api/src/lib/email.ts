import nodemailer from "nodemailer";
import { env } from "../config/env";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail(message: MailMessage) {
  if (env.SMTP_HOST && env.SMTP_PORT && env.SMTP_FROM) {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER && env.SMTP_PASSWORD ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });

    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    return;
  }

  console.info("[mail] queued", {
    to: message.to,
    subject: message.subject,
  });
}
