import { type LlmProviderName, generateAiCompletion } from "@foreman/ai";
import { QueueEvents, Worker } from "bullmq";
import pino from "pino";
import { persistBudgetNarrative } from "./budget-narrative-analysis";
import { type NotificationEmailPayload, sendNotificationEmail } from "./email";
import { persistInsuranceExtraction } from "./insurance-extraction-analysis";
import { resolveWorkerMode } from "./runtime";
import { startScheduler } from "./scheduler";
import { persistSiteSnapAnalysis } from "./site-snap-analysis";

const logger = pino({ name: "anvil-worker" });

const redisUrl = process.env.REDIS_URL;
const stopScheduler = startScheduler(logger);

if (resolveWorkerMode(redisUrl) === "idle") {
  logger.warn("REDIS_URL is not configured. Worker will stay idle.");
  const heartbeat = setInterval(() => {
    logger.info({ mode: "idle" }, "worker-heartbeat");
  }, 60_000);

  const shutdownIdle = (signal: string) => {
    logger.info({ signal }, "worker-shutdown");
    clearInterval(heartbeat);
    stopScheduler();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    shutdownIdle("SIGINT");
  });

  process.on("SIGTERM", () => {
    shutdownIdle("SIGTERM");
  });
} else {
  const connection = { url: redisUrl };

  const notificationWorker = new Worker(
    "notification-delivery",
    async (job) => {
      const data = job.data as NotificationEmailPayload;
      const result = await sendNotificationEmail(data);
      logger.info(
        {
          jobId: job.id,
          toEmail: data.toEmail,
          subject: data.subject,
          provider: result.provider,
          delivered: result.delivered,
        },
        "notification-job-processed",
      );
      return result;
    },
    { connection },
  );

  const aiTaskWorker = new Worker(
    "ai-task",
    async (job) => {
      const data = job.data as {
        provider?: LlmProviderName;
        model: string;
        prompt: string;
        context?: Record<string, unknown>;
      };

      const result = await generateAiCompletion(
        {
          provider: data.provider,
          model: data.model,
          prompt: data.prompt,
          context: data.context,
        },
        {
          openaiApiKey: process.env.OPENAI_API_KEY,
          anthropicApiKey: process.env.ANTHROPIC_API_KEY,
          geminiApiKey: process.env.GEMINI_API_KEY,
          azureOpenAiApiKey: process.env.AZURE_OPENAI_API_KEY,
          azureOpenAiEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
        },
      );

      const siteSnapPersistence = data.context
        ? await persistSiteSnapAnalysis({
            output: result.output,
            context: data.context,
            logger,
          })
        : { handled: false as const, reason: "no_context" as const };

      const budgetNarrativePersistence = data.context
        ? await persistBudgetNarrative({
            output: result.output,
            context: data.context,
            logger,
          })
        : { handled: false as const, reason: "no_context" as const };

      const insuranceExtractionPersistence = data.context
        ? await persistInsuranceExtraction({
            output: result.output,
            context: data.context,
            logger,
          })
        : { handled: false as const, reason: "no_context" as const };

      logger.info(
        {
          jobId: job.id,
          provider: result.provider,
          model: result.model,
          siteSnapPersistence,
          budgetNarrativePersistence,
          insuranceExtractionPersistence,
        },
        "ai-task-processed",
      );

      return {
        ...result,
        siteSnapPersistence,
        budgetNarrativePersistence,
        insuranceExtractionPersistence,
      };
    },
    { connection },
  );

  const aiEvents = new QueueEvents("ai-task", { connection });
  const notificationEvents = new QueueEvents("notification-delivery", {
    connection,
  });

  aiEvents.on("failed", ({ jobId, failedReason }) => {
    logger.error({ jobId, reason: failedReason }, "ai-task-failed");
  });

  notificationEvents.on("failed", ({ jobId, failedReason }) => {
    logger.error({ jobId, reason: failedReason }, "notification-job-failed");
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "worker-shutdown");
    await Promise.all([
      notificationWorker.close(),
      aiTaskWorker.close(),
      aiEvents.close(),
      notificationEvents.close(),
    ]);
    stopScheduler();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  logger.info("anvil worker started");
}
