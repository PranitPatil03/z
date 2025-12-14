import { buildEstimateBrief, generateAiCompletion } from "@foreman/ai";
import type { Request } from "express";
import { env } from "../config/env";
import { badRequest } from "../lib/errors";
import { aiTaskQueue, enqueueAiTask } from "../lib/queues";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  aiEstimateSchema,
  aiGenerateSchema,
  aiJobParamsSchema,
} from "../schemas/ai.schema";
import { entitlementsService } from "./entitlements";

function readValidatedBody<T>(request: Request) {
  return (request as ValidatedRequest).validated?.body as T;
}

function readValidatedParams<T>(request: Request) {
  return (request as ValidatedRequest).validated?.params as T;
}

function requireOrg(request: Request) {
  const { session } = getAuthContext(request);
  if (!session.activeOrganizationId) {
    throw badRequest("An active organization is required");
  }
  return session.activeOrganizationId;
}

export const aiService = {
  async generateText(request: Request) {
    const orgId = requireOrg(request);
    const body = aiGenerateSchema.parse(readValidatedBody(request));
    await entitlementsService.assertFeatureAccess(orgId, "ai.generate");
    const usageUnits = entitlementsService.estimateAiUnits(body.prompt);
    const subscription = await entitlementsService.assertAiUsageAllowed(
      orgId,
      usageUnits,
    );

    if (body.mode === "async") {
      const jobId = await enqueueAiTask({
        provider: body.provider,
        model: body.model,
        prompt: body.prompt,
        context: {
          ...(body.context ?? {}),
          organizationId: orgId,
        },
      });

      if (!jobId) {
        throw badRequest("Async AI mode requires REDIS_URL configuration");
      }

      const updatedSubscription = await entitlementsService.recordAiUsage({
        organizationId: orgId,
        subscriptionId: subscription.id,
        feature: "ai.generate",
        units: usageUnits,
        source: "ai.generate.async",
        model: body.model,
        metadata: {
          mode: body.mode,
          provider: body.provider ?? "openai",
        },
      });

      return {
        mode: "async",
        jobId,
        usage: {
          units: usageUnits,
          aiCreditsIncluded:
            updatedSubscription?.aiCreditsIncluded ??
            subscription.aiCreditsIncluded,
          aiCreditsUsed:
            updatedSubscription?.aiCreditsUsed ?? subscription.aiCreditsUsed,
        },
      };
    }

    const response = await generateAiCompletion(
      {
        provider: body.provider,
        model: body.model,
        prompt: body.prompt,
      },
      {
        openaiApiKey: env.OPENAI_API_KEY,
        anthropicApiKey: env.ANTHROPIC_API_KEY,
        geminiApiKey: env.GEMINI_API_KEY,
        azureOpenAiApiKey: env.AZURE_OPENAI_API_KEY,
        azureOpenAiEndpoint: env.AZURE_OPENAI_ENDPOINT,
      },
    );

    const updatedSubscription = await entitlementsService.recordAiUsage({
      organizationId: orgId,
      subscriptionId: subscription.id,
      feature: "ai.generate",
      units: usageUnits,
      source: "ai.generate.sync",
      model: body.model,
      metadata: {
        mode: body.mode,
        provider: response.provider,
      },
    });

    return {
      ...response,
      mode: "sync",
      usage: {
        units: usageUnits,
        aiCreditsIncluded:
          updatedSubscription?.aiCreditsIncluded ??
          subscription.aiCreditsIncluded,
        aiCreditsUsed:
          updatedSubscription?.aiCreditsUsed ?? subscription.aiCreditsUsed,
      },
    };
  },

  async getJobStatus(request: Request) {
    const params = aiJobParamsSchema.parse(readValidatedParams(request));

    if (!aiTaskQueue) {
      return {
        jobId: params.jobId,
        state: "queue_unavailable",
      };
    }

    const job = await aiTaskQueue.getJob(params.jobId);

    if (!job) {
      return {
        jobId: params.jobId,
        state: "not_found",
      };
    }

    const state = await job.getState();

    return {
      jobId: params.jobId,
      state,
      result: job.returnvalue ?? null,
      failedReason: job.failedReason ?? null,
    };
  },

  async buildEstimate(request: Request) {
    const orgId = requireOrg(request);
    const body = aiEstimateSchema.parse(readValidatedBody(request));

    return {
      organizationId: orgId,
      brief: buildEstimateBrief({
        projectName: body.projectName,
        scope: body.scope,
        budgetCents: body.budgetCents,
        constraints: body.constraints,
      }),
    };
  },
};
