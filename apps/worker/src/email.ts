import nodemailer from "nodemailer";

export interface NotificationEmailPayload {
  toEmail: string;
  subject: string;
  body: string;
  html?: string;
  toUserId?: string;
  notificationId?: string;
}

async function sendViaResend(payload: NotificationEmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return null;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [payload.toEmail],
      subject: payload.subject,
      text: payload.body,
      html: payload.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend delivery failed: ${response.status} ${body}`);
  }

  return "resend" as const;
}

async function sendViaSmtp(payload: NotificationEmailPayload) {
  const host = process.env.SMTP_HOST;
  const rawPort = process.env.SMTP_PORT;
  const from = process.env.SMTP_FROM;

  if (!host || !rawPort || !from) {
    return null;
  }

  const port = Number(rawPort);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
  });

  await transporter.sendMail({
    from,
    to: payload.toEmail,
    subject: payload.subject,
    text: payload.body,
    html: payload.html,
  });

  return "smtp" as const;
}

export async function sendNotificationEmail(payload: NotificationEmailPayload) {
  const provider = process.env.EMAIL_PROVIDER;

  if (provider === "resend") {
    const deliveredViaResend = await sendViaResend(payload);
    if (deliveredViaResend) {
      return { delivered: true, provider: deliveredViaResend };
    }
  }

  const deliveredViaSmtp = await sendViaSmtp(payload);
  if (deliveredViaSmtp) {
    return { delivered: true, provider: deliveredViaSmtp };
  }

  return { delivered: false, provider: "noop" as const };
}
