import { Router } from "express";
import {
  getCommandCenterHealthController,
  getCommandCenterOverviewController,
  getCommandCenterPortfolioController,
} from "../controllers/command-center";
import { asyncHandler } from "../lib/async-handler";
import { validateQuery } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import {
  commandCenterHealthQuerySchema,
  commandCenterOverviewQuerySchema,
  commandCenterPortfolioQuerySchema,
} from "../schemas/command-center.schema";

export const commandCenterRouter: import("express").Router = Router();

commandCenterRouter.use(requireAuth);

commandCenterRouter.get(
  "/overview",
  validateQuery(commandCenterOverviewQuerySchema),
  asyncHandler(getCommandCenterOverviewController),
);

commandCenterRouter.get(
  "/health",
  validateQuery(commandCenterHealthQuerySchema),
  asyncHandler(getCommandCenterHealthController),
);

commandCenterRouter.get(
  "/portfolio",
  validateQuery(commandCenterPortfolioQuerySchema),
  asyncHandler(getCommandCenterPortfolioController),
);
