import type { Request, Response } from "express";
import { smartMailService } from "../services/smartmail";

export async function listSmartMailAccountsController(
  request: Request,
  response: Response,
) {
  const data = await smartMailService.listAccounts(request);
  response.json({ data });
}

export async function createSmartMailAccountController(
  request: Request,
  response: Response,
) {
  const data = await smartMailService.createAccount(request);
  response.status(201).json({ data });
}

export async function updateSmartMailAccountController(
  request: Request,
  response: Response,
) {
  const data = await smartMailService.updateAccount(request);
  response.json({ data });
}

export async function listSmartMailThreadsController(
  request: Request,
  response: Response,
) {
  const data = await smartMailService.listThreads(request);
  response.json({ data });
}

export async function createSmartMailThreadController(
  request: Request,
  response: Response,
) {
  const data = await smartMailService.createThread(request);
  response.status(201).json({ data });
}

export async function listSmartMailMessagesController(
  request: Request,
  response: Response,
) {
  const data = await smartMailService.listMessages(request);
  response.json({ data });
}

export async function createSmartMailMessageController(
  request: Request,
  response: Response,
) {
  const data = await smartMailService.createMessage(request);
  response.status(201).json({ data });
}

export async function syncSmartMailAccountController(
  request: Request,
  response: Response,
) {
  const data = await smartMailService.syncAccount(request);
  response.json({ data });
}

export async function createSmartMailDraftController(
  request: Request,
  response: Response,
) {
  const data = await smartMailService.createDraft(request);
  response.status(201).json({ data });
}

export async function updateSmartMailMessageLinkController(
  request: Request,
  response: Response,
) {
  const data = await smartMailService.overrideMessageLink(request);
  response.json({ data });
}

export async function listSmartMailTemplatesController(
  request: Request,
  response: Response,
) {
  const data = await smartMailService.listTemplates(request);
  response.json({ data });
}

export async function createSmartMailTemplateController(
  request: Request,
  response: Response,
) {
  const data = await smartMailService.createTemplate(request);
  response.status(201).json({ data });
}

export async function updateSmartMailTemplateController(
  request: Request,
  response: Response,
) {
  const data = await smartMailService.updateTemplate(request);
  response.json({ data });
}

export async function deleteSmartMailTemplateController(
  request: Request,
  response: Response,
) {
  const data = await smartMailService.deleteTemplate(request);
  response.json({ data });
}
