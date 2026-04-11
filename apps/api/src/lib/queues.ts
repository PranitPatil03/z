import { Queue } from "bullmq";
import { env } from "../config/env";

const connection = env.REDIS_URL ? { url: env.REDIS_URL } : null;

export const aiTaskQueue = connection
  ? new Queue("ai-task", { connection })
  : null;
export const notificationDeliveryQueue = connection
  ? new Queue("notification-delivery", { connection })
  : null;

export async function enqueueAiTask(payload: {
  provider?: "openai" | "anthropic" | "gemini" | "azure-openai";
  model: string;
  prompt: string;
  context?: Record<string, unknown>;
}) {
  if (!aiTaskQueue) {
    return null;
  }

  const job = await aiTaskQueue.add("generate", payload, {
    attempts: 3,
    removeOnComplete: true,
    removeOnFail: false,
  });

  return job.id ?? null;
}

export async function enqueueNotificationDelivery(payload: {
  toEmail: string;
  toUserId?: string;
  subject: string;
  body: string;
  html?: string;
  notificationId?: string;
}) {
  if (!notificationDeliveryQueue) {
    return null;
  }

  const job = await notificationDeliveryQueue.add("deliver", payload, {
    attempts: 5,
    removeOnComplete: true,
    removeOnFail: false,
  });

  return job.id ?? null;
}
