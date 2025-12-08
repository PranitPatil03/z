import { Router } from "express";
import { createMatchRunController, getMatchRunController, listMatchRunsController } from "../controllers/match-run";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import { createMatchRunSchema, matchRunIdParamsSchema } from "../schemas/match-run.schema";

export const matchRunsRouter = Router();

matchRunsRouter.use(requireAuth);

matchRunsRouter.get("/", asyncHandler(listMatchRunsController));
matchRunsRouter.post("/", validateBody(createMatchRunSchema), asyncHandler(createMatchRunController));
matchRunsRouter.get("/:matchRunId", validateParams(matchRunIdParamsSchema), asyncHandler(getMatchRunController));
