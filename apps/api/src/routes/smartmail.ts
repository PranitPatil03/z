import { Router } from "express";
import {
  createSmartMailAccountController,
  createSmartMailMessageController,
  createSmartMailThreadController,
  listSmartMailAccountsController,
  listSmartMailMessagesController,
  listSmartMailThreadsController,
  updateSmartMailAccountController,
} from "../controllers/smartmail";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams, validateQuery } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import {
  createSmartMailAccountSchema,
  createSmartMailMessageSchema,
  createSmartMailThreadSchema,
  listSmartMailThreadsQuerySchema,
  smartMailAccountIdParamsSchema,
  smartMailThreadIdParamsSchema,
  updateSmartMailAccountSchema,
} from "../schemas/smartmail.schema";

export const smartMailRouter: import("express").Router = Router();

smartMailRouter.use(requireAuth);

smartMailRouter.get("/accounts", asyncHandler(listSmartMailAccountsController));
smartMailRouter.post("/accounts", validateBody(createSmartMailAccountSchema), asyncHandler(createSmartMailAccountController));
smartMailRouter.patch(
  "/accounts/:accountId",
  validateParams(smartMailAccountIdParamsSchema),
  validateBody(updateSmartMailAccountSchema),
  asyncHandler(updateSmartMailAccountController),
);
smartMailRouter.get("/threads", validateQuery(listSmartMailThreadsQuerySchema), asyncHandler(listSmartMailThreadsController));
smartMailRouter.post("/threads", validateBody(createSmartMailThreadSchema), asyncHandler(createSmartMailThreadController));
smartMailRouter.get(
  "/threads/:threadId/messages",
  validateParams(smartMailThreadIdParamsSchema),
  asyncHandler(listSmartMailMessagesController),
);
smartMailRouter.post(
  "/threads/:threadId/messages",
  validateParams(smartMailThreadIdParamsSchema),
  validateBody(createSmartMailMessageSchema),
  asyncHandler(createSmartMailMessageController),
);
