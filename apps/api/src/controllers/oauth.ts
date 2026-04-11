import type { Request, Response } from "express";
import { oauthService } from "../services/oauth";

export async function getGmailAuthUrlController(
  request: Request,
  response: Response,
) {
  const data = await oauthService.getGmailAuthUrl(request);
  response.json(data);
}

export async function getOutlookAuthUrlController(
  request: Request,
  response: Response,
) {
  const data = await oauthService.getOutlookAuthUrl(request);
  response.json(data);
}

export async function handleOAuthCallbackController(
  request: Request,
  response: Response,
) {
  const data = await oauthService.handleOAuthCallback(request);
  response.json(data);
}

export async function disconnectOAuthAccountController(
  request: Request,
  response: Response,
) {
  const data = await oauthService.disconnectAccount(request);
  response.json(data);
}

export async function syncEmailsController(
  request: Request,
  response: Response,
) {
  const data = await oauthService.syncEmails(request);
  response.json(data);
}
