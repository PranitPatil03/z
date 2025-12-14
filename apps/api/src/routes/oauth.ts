import { Router } from "express";
import {
  disconnectOAuthAccountController,
  getGmailAuthUrlController,
  getOutlookAuthUrlController,
  handleOAuthCallbackController,
  syncEmailsController,
} from "../controllers/oauth";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateQuery } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import {
  disconnectOAuthAccountSchema,
  oauthCallbackSchema,
  syncEmailsSchema,
} from "../schemas/oauth.schema";

export const oauthRouter: import("express").Router = Router();

oauthRouter.get(
  "/gmail/auth-url",
  requireAuth,
  asyncHandler(getGmailAuthUrlController),
);
oauthRouter.get(
  "/outlook/auth-url",
  requireAuth,
  asyncHandler(getOutlookAuthUrlController),
);

oauthRouter.post(
  "/callback",
  validateBody(oauthCallbackSchema),
  asyncHandler(handleOAuthCallbackController),
);

oauthRouter.use(requireAuth);

oauthRouter.post(
  "/disconnect",
  validateBody(disconnectOAuthAccountSchema),
  asyncHandler(disconnectOAuthAccountController),
);

oauthRouter.post(
  "/sync-emails",
  validateBody(syncEmailsSchema),
  asyncHandler(syncEmailsController),
);
