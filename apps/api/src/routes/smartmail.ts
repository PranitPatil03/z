import { Router } from "express";
import {
  createSmartMailAccountController,
  createSmartMailDraftController,
  createSmartMailMessageController,
  createSmartMailTemplateController,
  createSmartMailThreadController,
  deleteSmartMailTemplateController,
  listSmartMailAccountsController,
  listSmartMailMessagesController,
  listSmartMailTemplatesController,
  listSmartMailThreadsController,
  syncSmartMailAccountController,
  updateSmartMailAccountController,
  updateSmartMailMessageLinkController,
  updateSmartMailTemplateController,
} from "../controllers/smartmail";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams, validateQuery } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import {
  createSmartMailAccountSchema,
  createSmartMailDraftSchema,
  createSmartMailMessageSchema,
  createSmartMailTemplateSchema,
  createSmartMailThreadSchema,
  listSmartMailTemplatesQuerySchema,
  listSmartMailThreadsQuerySchema,
  smartMailAccountIdParamsSchema,
  smartMailMessageIdParamsSchema,
  smartMailTemplateIdParamsSchema,
  smartMailThreadIdParamsSchema,
  syncSmartMailAccountSchema,
  updateSmartMailAccountSchema,
  updateSmartMailMessageLinkSchema,
  updateSmartMailTemplateSchema,
} from "../schemas/smartmail.schema";

export const smartMailRouter: import("express").Router = Router();

smartMailRouter.use(requireAuth);

smartMailRouter.get("/accounts", asyncHandler(listSmartMailAccountsController));
smartMailRouter.post(
  "/accounts",
  validateBody(createSmartMailAccountSchema),
  asyncHandler(createSmartMailAccountController),
);
smartMailRouter.patch(
  "/accounts/:accountId",
  validateParams(smartMailAccountIdParamsSchema),
  validateBody(updateSmartMailAccountSchema),
  asyncHandler(updateSmartMailAccountController),
);
smartMailRouter.post(
  "/accounts/:accountId/sync",
  validateParams(smartMailAccountIdParamsSchema),
  validateBody(syncSmartMailAccountSchema),
  asyncHandler(syncSmartMailAccountController),
);
smartMailRouter.get(
  "/threads",
  validateQuery(listSmartMailThreadsQuerySchema),
  asyncHandler(listSmartMailThreadsController),
);
smartMailRouter.post(
  "/threads",
  validateBody(createSmartMailThreadSchema),
  asyncHandler(createSmartMailThreadController),
);
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
smartMailRouter.post(
  "/threads/:threadId/drafts",
  validateParams(smartMailThreadIdParamsSchema),
  validateBody(createSmartMailDraftSchema),
  asyncHandler(createSmartMailDraftController),
);
smartMailRouter.patch(
  "/messages/:messageId/link",
  validateParams(smartMailMessageIdParamsSchema),
  validateBody(updateSmartMailMessageLinkSchema),
  asyncHandler(updateSmartMailMessageLinkController),
);
smartMailRouter.get(
  "/templates",
  validateQuery(listSmartMailTemplatesQuerySchema),
  asyncHandler(listSmartMailTemplatesController),
);
smartMailRouter.post(
  "/templates",
  validateBody(createSmartMailTemplateSchema),
  asyncHandler(createSmartMailTemplateController),
);
smartMailRouter.patch(
  "/templates/:templateId",
  validateParams(smartMailTemplateIdParamsSchema),
  validateBody(updateSmartMailTemplateSchema),
  asyncHandler(updateSmartMailTemplateController),
);
smartMailRouter.delete(
  "/templates/:templateId",
  validateParams(smartMailTemplateIdParamsSchema),
  asyncHandler(deleteSmartMailTemplateController),
);
