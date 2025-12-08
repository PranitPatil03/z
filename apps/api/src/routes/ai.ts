import { Router } from "express";
import { buildAiEstimateController, generateAiTextController, getAiJobStatusController } from "../controllers/ai";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import { aiEstimateSchema, aiGenerateSchema, aiJobParamsSchema } from "../schemas/ai.schema";

export const aiRouter = Router();

aiRouter.use(requireAuth);

aiRouter.post("/generate", validateBody(aiGenerateSchema), asyncHandler(generateAiTextController));
aiRouter.post("/estimate-brief", validateBody(aiEstimateSchema), asyncHandler(buildAiEstimateController));
aiRouter.get("/jobs/:jobId", validateParams(aiJobParamsSchema), asyncHandler(getAiJobStatusController));
