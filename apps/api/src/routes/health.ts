import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { healthService, readinessService } from "../services/health";

export const healthRouter: import("express").Router = Router();

healthRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    response.json(healthService());
  }),
);

healthRouter.get(
  "/ready",
  asyncHandler(async (_request, response) => {
    const readiness = await readinessService();
    response.status(readiness.ready ? 200 : 503).json(readiness);
  }),
);
