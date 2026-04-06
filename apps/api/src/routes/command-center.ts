import { Router } from "express";
import { getCommandCenterOverviewController } from "../controllers/command-center";
import { asyncHandler } from "../lib/async-handler";
import { validateQuery } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import { commandCenterOverviewQuerySchema } from "../schemas/command-center.schema";

export const commandCenterRouter: import("express").Router = Router();

commandCenterRouter.use(requireAuth);

commandCenterRouter.get(
  "/overview",
  validateQuery(commandCenterOverviewQuerySchema),
  asyncHandler(getCommandCenterOverviewController),
);
