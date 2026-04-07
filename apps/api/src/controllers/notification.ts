import type { Request, Response } from "express";
import { notificationService } from "../services/notification";

export async function listMyNotificationsController(request: Request, response: Response) {
  const data = await notificationService.listMine(request);
  response.json({ data });
}

export async function getUnreadNotificationCountController(request: Request, response: Response) {
  const data = await notificationService.unreadCount(request);
  response.json({ data });
}

export async function getNotificationPreferencesController(request: Request, response: Response) {
  const data = await notificationService.getPreferences(request);
  response.json({ data });
}

export async function updateNotificationPreferencesController(request: Request, response: Response) {
  const data = await notificationService.updatePreferences(request);
  response.json({ data });
}

export async function createNotificationController(request: Request, response: Response) {
  const data = await notificationService.createFromRequest(request);
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
