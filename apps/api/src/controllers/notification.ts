import type { Request, Response } from "express";
import { notificationService } from "../services/notification";

export async function listMyNotificationsController(request: Request, response: Response) {
  const data = await notificationService.listMine(request);
  response.json({ data });
}

export async function createNotificationController(request: Request, response: Response) {
  const data = await notificationService.create(request);
  response.status(201).json({ data });
}

export async function markNotificationAsReadController(request: Request, response: Response) {
  const data = await notificationService.markAsRead(request);
  response.json({ data });
}

export async function deleteNotificationController(request: Request, response: Response) {
  const data = await notificationService.remove(request);
  response.json({ data });
}
