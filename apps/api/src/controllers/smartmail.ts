import type { Request, Response } from "express";
import { smartMailService } from "../services/smartmail";

export async function listSmartMailAccountsController(request: Request, response: Response) {
  const data = await smartMailService.listAccounts(request);
  response.json({ data });
}

export async function createSmartMailAccountController(request: Request, response: Response) {
  const data = await smartMailService.createAccount(request);
  response.status(201).json({ data });
}

export async function updateSmartMailAccountController(request: Request, response: Response) {
  const data = await smartMailService.updateAccount(request);
  response.json({ data });
}

export async function listSmartMailThreadsController(request: Request, response: Response) {
  const data = await smartMailService.listThreads(request);
  response.json({ data });
}

export async function createSmartMailThreadController(request: Request, response: Response) {
  const data = await smartMailService.createThread(request);
  response.status(201).json({ data });
}

export async function listSmartMailMessagesController(request: Request, response: Response) {
  const data = await smartMailService.listMessages(request);
  response.json({ data });
}

export async function createSmartMailMessageController(request: Request, response: Response) {
  const data = await smartMailService.createMessage(request);
  response.status(201).json({ data });
}
