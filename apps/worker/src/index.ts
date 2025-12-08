import { generateAiCompletion, type LlmProviderName } from "@foreman/ai";
import { QueueEvents, Worker } from "bullmq";
import pino from "pino";
import { resolveWorkerMode } from "./runtime";

const logger = pino({ name: "foreman-worker" });

const redisUrl = process.env.REDIS_URL;

if (resolveWorkerMode(redisUrl) === "idle") {
	logger.warn("REDIS_URL is not configured. Worker will stay idle.");
	setInterval(() => {
		logger.info({ mode: "idle" }, "worker-heartbeat");
	}, 60_000);
} else {
	const connection = { url: redisUrl };

	const notificationWorker = new Worker(
		"notification-delivery",
		async (job) => {
			const data = job.data as { to: string; subject: string; body: string };
			logger.info({
				jobId: job.id,
				to: data.to,
				subject: data.subject,
			}, "notification-job-processed");
			return { delivered: true };
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

			logger.info({
				jobId: job.id,
				provider: result.provider,
				model: result.model,
			}, "ai-task-processed");

			return result;
		},
		{ connection },
	);

	const aiEvents = new QueueEvents("ai-task", { connection });
	const notificationEvents = new QueueEvents("notification-delivery", { connection });

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
		process.exit(0);
	};

	process.on("SIGINT", () => {
		void shutdown("SIGINT");
	});

	process.on("SIGTERM", () => {
		void shutdown("SIGTERM");
	});

	logger.info("Foreman worker started");
}
