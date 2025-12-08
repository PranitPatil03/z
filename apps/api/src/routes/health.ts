import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { healthService } from "../services/health";

export const healthRouter = Router();

healthRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    response.json(healthService());
  }),
);
